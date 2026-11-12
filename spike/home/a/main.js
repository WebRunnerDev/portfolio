// Spike A · Cast — molten rust poured into the seven logo diamonds, cooled into
// cast graphite; the blocks then carry the page: header logo → chapter markers →
// reassembled, hot again, in the contact footer.
import * as THREE from "three"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js"
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js"
import { OutputPass } from "three/addons/postprocessing/OutputPass.js"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { content, logoDiamonds } from "/shared/content.js"

gsap.registerPlugin(ScrollTrigger)
history.scrollRestoration = "manual"
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const easeInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

/* ---------------- DOM content ---------------- */
$("[data-location]").textContent = content.location
$("[data-name]").textContent = content.name
$("[data-headline]").textContent = content.headline
$("[data-about]").textContent = content.about
const email = $("[data-email]")
email.textContent = content.email
email.href = `mailto:${content.email}`
$("[data-stats]").innerHTML = content.stats
  .map(([n, l]) => `<div><dt data-count="${n}">${n}</dt><dd>${l}</dd></div>`)
  .join("")
$("[data-projects]").innerHTML = content.projects
  .map(
    (p, i) => `<li class="project"><a href="#">
    <span class="project__n">(${String(i + 1).padStart(2, "0")})</span>
    <span class="project__title">${p.title}</span>
    <span class="project__meta"><span>${p.text}</span><span class="project__tags">${p.tags.join(" · ")}</span></span>
    <span class="project__year">${p.year}<b>↗</b></span></a></li>`
  )
  .join("")
$("[data-posts]").innerHTML = content.posts
  .map(
    (p, i) =>
      `<a class="post" href="#"><span class="post__n">0${i + 1}</span><time>${p.date}</time><div><h3>${p.title}</h3><p>${p.text}</p></div></a>`
  )
  .join("")
// Split the statement into word masks.
for (const el of $$(".split")) {
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment()
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue
          if (/^\s+$/.test(part)) frag.append(part)
          else {
            const w = document.createElement("span")
            w.className = "w"
            w.innerHTML = `<span>${part}</span>`
            frag.append(w)
          }
        }
        child.replaceWith(frag)
      } else walk(child)
    }
  }
  walk(el)
}

// Fit the stat numbers: one size for all three, the widest one fills its column.
function fitStats() {
  const dts = $$("[data-count]")
  dts.forEach((d) => {
    d.style.fontSize = ""
    d.textContent = d.dataset.count
  })
  let k = 1
  for (const d of dts) {
    const avail = d.parentElement.clientWidth - 24
    k = Math.min(k, avail / d.scrollWidth)
  }
  const base = parseFloat(getComputedStyle(dts[0]).fontSize)
  dts.forEach((d) => {
    d.style.fontSize = `${Math.floor(base * Math.min(1, k * 0.98))}px`
  })
}
document.fonts.ready.then(fitStats)
addEventListener("resize", fitStats)

/* ---------------- Renderer ---------------- */
const canvas = $(".stage")
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
})
const DPR = Math.min(devicePixelRatio, 1.75)
renderer.setPixelRatio(DPR)
renderer.setSize(innerWidth, innerHeight, false)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d0d0e)
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.95

const FOV = 30
const CAM_D = 24
const camera = new THREE.PerspectiveCamera(
  FOV,
  innerWidth / innerHeight,
  0.1,
  200
)
camera.position.set(0, 0, CAM_D)
const viewH = () => 2 * CAM_D * Math.tan(THREE.MathUtils.degToRad(FOV / 2))

const key = new THREE.DirectionalLight(0xfff1e6, 2.6)
key.position.set(-8, 10, 9)
scene.add(key)
const rim = new THREE.DirectionalLight(0x9fb4ff, 1.4)
rim.position.set(10, -2, -6)
scene.add(rim)
const fill = new THREE.PointLight(0xff5a2a, 0, 30, 1.6) // follows the hot spot
scene.add(fill)

/* ---------------- Shaders ---------------- */
const NOISE = /* glsl */ `
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), u.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*vnoise(p); p = p*2.03 + 1.7; a *= 0.5; } return s; }
vec3 heatRamp(float t){
  t = clamp(t, 0.0, 1.25);
  vec3 c = mix(vec3(0.0), vec3(0.28, 0.02, 0.008), smoothstep(0.0, 0.25, t));
  c = mix(c, vec3(0.62, 0.07, 0.03), smoothstep(0.2, 0.5, t));
  c = mix(c, vec3(1.0, 0.30, 0.06), smoothstep(0.45, 0.8, t));
  c = mix(c, vec3(1.0, 0.78, 0.45), smoothstep(0.82, 1.15, t));
  return c;
}`

const shared = {
  uTime: { value: 0 },
  uMolten: { value: 1 },
  uHeatPoint: { value: new THREE.Vector3(0, 0, 0) },
  uHeatAmt: { value: 0 },
  uHeatR: { value: 2.2 },
}

function makeBlockMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0x55575e,
    metalness: 0.95,
    roughness: 0.3,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
  })
  m.userData.u = {
    uFill: { value: 0 },
    uBlockHeat: { value: 0 },
    uFlash: { value: 0 },
  }
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, m.userData.u)
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWorldP;\nvarying vec3 vLocalP;"
      )
      .replace(
        "#include <fog_vertex>",
        "#include <fog_vertex>\nvLocalP = position;\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;"
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vWorldP; varying vec3 vLocalP;
uniform float uTime, uMolten, uHeatAmt, uHeatR, uFill, uBlockHeat, uFlash; uniform vec3 uHeatPoint;
${NOISE}`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
{
  float yN = (vLocalP.y + 1.17) / 2.34;
  float wob = sin(vLocalP.x*7.0 + uTime*5.0)*0.014 + sin(vLocalP.x*13.0 - uTime*3.3)*0.007;
  float filled = 1.0 - smoothstep(uFill - 0.012, uFill + 0.012, yN + wob);
  float n = fbm(vLocalP.xy*2.3 + vec2(0.0, -uTime*0.7) + vLocalP.z);
  float vn = fbm(vLocalP.xy*1.7 + vLocalP.z*0.9 + 3.0 + vec2(uTime*0.02, 0.0));
  float vein = 1.0 - smoothstep(0.0, 0.045, abs(vn - 0.5));
  float vn2 = fbm(vLocalP.xy*3.9 - vLocalP.z*1.3 + 11.0);
  vein = max(vein, 0.6*(1.0 - smoothstep(0.0, 0.03, abs(vn2 - 0.5))));
  float molten = filled * (0.5 + 0.2*n + 0.3*vein);
  molten += filled * smoothstep(0.08, 0.0, abs(uFill - yN - wob)) * step(uFill, 0.995) * 0.45;
  float crust = fbm(vLocalP.xy*3.1 + 7.0 + vLocalP.z*2.0);
  molten *= clamp(uMolten*2.0 - crust*1.0 + vein*uMolten*0.8, 0.0, 1.0);
  float d = distance(vWorldP.xy, uHeatPoint.xy);
  float fall = exp(-d*d/(uHeatR*uHeatR));
  float heat = uHeatAmt * fall * (0.42 + 0.3*fbm(vWorldP.xy*1.4 + vec2(uTime*0.25, -uTime*0.4)) + 0.55*vein);
  float bh = uBlockHeat * (0.12 + 0.95*vein) * (0.85 + 0.3*n);
  float t = max(max(molten, heat), max(bh, uFlash*(0.45 + 0.35*n + 0.5*vein)));
  float hot = smoothstep(0.25, 0.85, t);
  diffuseColor.rgb *= 1.0 - 0.85*hot;
  metalnessFactor = mix(metalnessFactor, 0.2, hot);
  roughnessFactor = clamp(roughnessFactor * (0.7 + 0.6*fbm(vLocalP.xy*7.0 + vLocalP.z*4.0)) + hot*0.3, 0.05, 1.0);
  totalEmissiveRadiance += heatRamp(t) * pow(t, 1.6) * mix(5.0, 3.2, uMolten);
}`
      )
  }
  return m
}

const seamMaterial = (u) =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uSeam: u },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vP; uniform float uTime, uSeam; ${NOISE}
  void main(){
    float l1 = abs(vP.x) + abs(vP.y);
    float edge = smoothstep(1.42, 1.12, l1);
    float n = fbm(vP*3.2 + vec2(uTime*0.35, -uTime*0.55));
    float t = uSeam * (0.5 + 0.7*n);
    gl_FragColor = vec4(heatRamp(t) * pow(t, 1.3) * 4.5 * edge, 1.0);
  }`,
  })

/* ---------------- Blocks ---------------- */
const shape = new THREE.Shape()
shape.moveTo(0, 1)
shape.lineTo(1, 0)
shape.lineTo(0, -1)
shape.lineTo(-1, 0)
shape.closePath()
const blockGeo = new THREE.ExtrudeGeometry(shape, {
  depth: 0.85,
  bevelEnabled: true,
  bevelThickness: 0.2,
  bevelSize: 0.12,
  bevelSegments: 5,
  curveSegments: 1,
})
blockGeo.center()
blockGeo.computeVertexNormals()
const R_L1 = 1 + 0.12 * Math.SQRT2 // half-diagonal of the bevelled block
const seamShape = new THREE.Shape()
const SR = 1.42
seamShape.moveTo(0, SR)
seamShape.lineTo(SR, 0)
seamShape.lineTo(0, -SR)
seamShape.lineTo(-SR, 0)
seamShape.closePath()
const seamGeo = new THREE.ShapeGeometry(seamShape)

// Chapter assignment: which block marks which chapter (order of logoDiamonds).
const CHAPTER_OF = [0, 1, 2, -1, -1, -1, -1]
// Pour order: top of the logo first, as if poured from a sprue above.
const pourOrder = logoDiamonds
  .map((d, i) => [d[1], i])
  .sort((a, b) => a[0] - b[0])
  .map(([, i]) => i)

const blocks = logoDiamonds.map((_, i) => {
  const group = new THREE.Group()
  const mat = makeBlockMaterial()
  const mesh = new THREE.Mesh(blockGeo, mat)
  const seamU = { value: 1 }
  const seam = new THREE.Mesh(seamGeo, seamMaterial(seamU))
  seam.position.z = -0.58
  group.add(seam, mesh)
  scene.add(group)
  return {
    group,
    mat,
    seamU,
    pos: new THREE.Vector3(),
    scale: 0.0001,
    rot: new THREE.Euler(),
    tilt: { x: 0, y: 0, vx: 0, vy: 0 },
    flash: 0,
    arrived: false,
    phase: Math.random() * 6.28,
  }
})

/* ---------------- Post ---------------- */
const composer = new EffectComposer(renderer)
composer.setPixelRatio(DPR)
composer.setSize(innerWidth, innerHeight)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  0.7,
  0.42,
  0.9
)
composer.addPass(bloom)
const finish = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec4 c = texture2D(tDiffuse, vUv);
    vec2 q = vUv - 0.5; q.x *= uRes.x/uRes.y;
    c.rgb *= mix(1.0, 0.55, smoothstep(0.35, 1.1, length(q)));
    c.rgb += (h(vUv*uRes + fract(uTime)*91.0) - 0.5) * 0.018;
    gl_FragColor = c;
  }`,
})
composer.addPass(finish)
composer.addPass(new OutputPass())

/* ---------------- Layout: DOM anchors → world ---------------- */
const anchors = Object.fromEntries(
  $$("[data-anchor]").map((el) => [el.dataset.anchor, el])
)
const rectOf = (el) => {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}
function toWorld(px, py, out) {
  const H = viewH(),
    W = H * (innerWidth / innerHeight)
  out.set((px / innerWidth - 0.5) * W, -(py / innerHeight - 0.5) * H, 0)
  return out
}
const pxToWorld = (p) => (p / innerHeight) * viewH()
// Logo layout in a square rect: position and scale of block i.
function logoSlot(rect, i, out) {
  const s = Math.min(rect.w, rect.h)
  const [cx, cy] = logoDiamonds[i]
  toWorld(
    rect.x + rect.w / 2 + ((cx - 5) / 10) * s,
    rect.y + rect.h / 2 + ((cy - 5) / 10) * s,
    out.pos
  )
  out.scale = (pxToWorld(s * 0.15) * 0.9) / R_L1
  return out
}
function singleSlot(rect, out) {
  toWorld(rect.x + rect.w / 2, rect.y + rect.h / 2, out.pos)
  out.scale = pxToWorld(Math.min(rect.w, rect.h) * 0.5) / R_L1
  return out
}
const slot = () => ({ pos: new THREE.Vector3(), scale: 1 })
const sA = slot(),
  sB = slot(),
  sC = slot()

/* ---------------- Pointer ---------------- */
const pointer = {
  x: innerWidth * 0.7,
  y: innerHeight * 0.5,
  last: -10,
  speed: 0,
  inside: false,
}
addEventListener("pointermove", (e) => {
  const dx = e.clientX - pointer.x,
    dy = e.clientY - pointer.y
  pointer.speed = Math.min(1, pointer.speed + Math.hypot(dx, dy) / 400)
  pointer.x = e.clientX
  pointer.y = e.clientY
  pointer.last = performance.now()
  pointer.inside = true
})
document.addEventListener("pointerleave", () => {
  pointer.inside = false
})
const pointerWorld = new THREE.Vector3()
const heatTarget = new THREE.Vector3()
let workHover = 0
$("[data-projects]").addEventListener("pointerover", () => {
  workHover = 1
})
$("[data-projects]").addEventListener("pointerleave", () => {
  workHover = 0
})

/* ---------------- Intro timeline ---------------- */
const intro = {
  fills: blocks.map(() => ({ v: 0 })),
  molten: 1,
  k: 0,
  seam: 1.15,
  done: false,
}
const countEl = $("[data-loader-count]"),
  barEl = $("[data-loader-bar]"),
  labelEl = $("[data-loader-label]"),
  tempEl = $("[data-loader-temp]")
const tl = gsap.timeline({ delay: 0.25 })
pourOrder.forEach((bi, k) =>
  tl.to(
    intro.fills[bi],
    { v: 1, duration: 0.85, ease: "power2.inOut" },
    k * 0.12
  )
)
tl.eventCallback("onUpdate", () => {
  const avg = intro.fills.reduce((s, f) => s + f.v, 0) / blocks.length
  countEl.textContent = String(Math.round(avg * 100)).padStart(3, "0")
  barEl.style.transform = `scaleX(${avg})`
})
tl.call(
  () => {
    labelEl.textContent = "Cooling"
  },
  null,
  1.62
)
tl.to(
  intro,
  {
    molten: 0,
    duration: 1.05,
    ease: "power2.in",
    onUpdate: () => {
      tempEl.textContent = `${Math.round(20 + 1518 * intro.molten)} °C`
    },
  },
  1.62
)
tl.to(intro, { seam: 0.42, duration: 1.3, ease: "power2.out" }, 1.8)
tl.to(".loader", { opacity: 0, duration: 0.6, ease: "power2.out" }, 2.1)
tl.to(intro, { k: 1, duration: 1.25, ease: "expo.inOut" }, 2.0)
tl.to(
  ".hero .reveal > span",
  { y: 0, duration: 1.1, ease: "expo.out", stagger: 0.06 },
  2.55
)
tl.call(
  () => {
    intro.done = true
    document.body.classList.remove("is-loading")
    $(".loader").remove()
  },
  null,
  3.4
)

/* ---------------- Scroll reveals (DOM) ---------------- */
for (const head of $$(".chapter__head")) {
  ScrollTrigger.create({
    trigger: head,
    start: "top 85%",
    end: "top 35%",
    scrub: 0.6,
    onUpdate: (s) => head.style.setProperty("--line", s.progress.toFixed(3)),
  })
}
gsap.to(".about__statement .w > span", {
  y: 0,
  duration: 1,
  ease: "expo.out",
  stagger: 0.025,
  scrollTrigger: { trigger: ".about__statement", start: "top 95%" },
})
gsap.from(".about__body > *", {
  y: 40,
  opacity: 0,
  duration: 1,
  ease: "expo.out",
  stagger: 0.1,
  scrollTrigger: { trigger: ".about__body", start: "top 85%" },
})
for (const dt of $$("[data-count]")) {
  const raw = dt.dataset.count,
    m = raw.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/)
  if (!m) continue
  const o = { v: 0 },
    dec = (m[2].split(".")[1] || "").length
  gsap.to(o, {
    v: +m[2],
    duration: 1.6,
    ease: "expo.out",
    scrollTrigger: { trigger: dt, start: "top 88%" },
    onUpdate: () => {
      dt.textContent = m[1] + o.v.toFixed(dec) + m[3]
    },
  })
}
gsap.from(".project", {
  y: 60,
  opacity: 0,
  duration: 1.1,
  ease: "expo.out",
  stagger: 0.08,
  scrollTrigger: { trigger: ".projects", start: "top 80%" },
})
gsap.from(".post", {
  y: 80,
  opacity: 0,
  duration: 1.1,
  ease: "expo.out",
  stagger: 0.1,
  scrollTrigger: { trigger: ".posts", start: "top 85%" },
})
gsap.to(".contact__title .reveal > span", {
  y: 0,
  duration: 1.2,
  ease: "expo.out",
  stagger: 0.08,
  scrollTrigger: { trigger: ".contact__title", start: "top 85%" },
})
gsap.from(".contact__email", {
  y: 40,
  opacity: 0,
  duration: 1,
  ease: "expo.out",
  scrollTrigger: { trigger: ".contact__email", start: "top 92%" },
})

/* ---------------- Frame ---------------- */
const clock = new THREE.Clock()
const tmp = new THREE.Vector3()
let scrolled = false
const tempOut = $("[data-temp]")
let tempShown = 20

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20)
  const t = clock.elapsedTime
  shared.uTime.value = t
  finish.uniforms.uTime.value = t
  shared.uMolten.value = intro.molten

  const vw = innerWidth,
    vh = innerHeight
  const hero = rectOf($(".hero"))
  const heroLogo = rectOf(anchors.hero)
  const dock = rectOf(anchors.dock)
  const footer = rectOf(anchors.footer)
  const introRect = {
    x: vw / 2 - Math.min(vw, vh) * 0.3,
    y: vh / 2 - Math.min(vw, vh) * 0.3 - vh * 0.04,
    w: Math.min(vw, vh) * 0.6,
    h: Math.min(vw, vh) * 0.6,
  }
  const ik = intro.k
  // Hero exit → the blocks dock into the header logo.
  const hx = easeInOut(clamp(-hero.y / (hero.h * 0.75)))
  const kF = easeInOut(clamp((vh * 1.0 - footer.y) / (vh * 0.75)))
  const isScrolled = hx > 0.95
  if (isScrolled !== scrolled) {
    scrolled = isScrolled
    document.body.classList.toggle("is-scrolled", scrolled)
  }

  // Pointer → world on the blocks' front plane; heat follows with lag.
  const active =
    intro.done && performance.now() - pointer.last < 1800 && pointer.inside
  pointer.speed *= Math.exp(-dt * 1.8)
  toWorld(pointer.x, pointer.y, pointerWorld)
  heatTarget.copy(pointerWorld)
  shared.uHeatPoint.value.lerp(heatTarget, 1 - Math.exp(-dt * 7))
  const heatGoal = active ? 0.62 + 0.5 * pointer.speed : 0
  shared.uHeatAmt.value = lerp(
    shared.uHeatAmt.value,
    heatGoal,
    1 - Math.exp(-dt * (heatGoal > shared.uHeatAmt.value ? 4 : 1.4))
  )
  shared.uHeatR.value = 1.6 + 0.9 * pointer.speed
  fill.position.set(shared.uHeatPoint.value.x, shared.uHeatPoint.value.y, 2.5)
  fill.intensity = shared.uHeatAmt.value * 45

  let hottest = 0
  blocks.forEach((b, i) => {
    // 1. intro → hero logo
    logoSlot(introRect, i, sA)
    logoSlot(heroLogo, i, sB)
    const p = sA.pos.lerp(sB.pos, ik)
    let scale = lerp(sA.scale, sB.scale, ik)
    let rx = lerp(-0.1 - t * 0.012, -0.26, ik),
      ry = lerp(0.16 + t * 0.02, 0.36, ik),
      rz = 0
    let z = lerp(2.0, 0, ik)
    // 2. hero → header dock
    if (hx > 0) {
      logoSlot(dock, i, sC)
      const w = hx
      p.lerp(sC.pos, w)
      scale = lerp(scale, sC.scale, w)
      rx = lerp(rx, -0.2, w)
      ry = lerp(ry, 0.3, w)
      z += Math.sin(Math.PI * w) * 3.5
      rz += Math.sin(Math.PI * w) * (i % 2 ? 0.6 : -0.6)
    }
    // 3. dock → chapter marker
    const ch = CHAPTER_OF[i]
    let kc = 0
    if (ch >= 0) {
      const ar = rectOf(anchors[`ch${ch}`])
      kc = easeInOut(clamp((vh * 0.98 - ar.y) / (vh * 0.5)))
      if (kc > 0) {
        singleSlot(ar, sC)
        p.lerp(sC.pos, kc)
        scale = lerp(scale, sC.scale, kc)
        rx = lerp(rx, -0.3 + Math.sin(t * 0.7 + i) * 0.08, kc)
        ry = lerp(ry, 0.45 + Math.sin(t * 0.5 + i) * 0.35, kc)
        rz = lerp(rz, Math.sin(t * 0.35 + i) * 0.25, kc)
        z += Math.sin(Math.PI * kc) * 2.2
        rx += Math.sin(Math.PI * kc) * 1.2
        ry += easeOut(kc) * Math.PI * 2 * (1 - kc) * 0.5
      }
      if (kc > 0.985 && !b.arrived) {
        b.arrived = true
        b.flash = 1
      }
      if (kc < 0.6) b.arrived = false
    }
    // 4. everything → footer logo, hot again
    if (kF > 0) {
      logoSlot(footer, i, sC)
      p.lerp(sC.pos, kF)
      scale = lerp(scale, sC.scale, kF)
      rx = lerp(rx, -0.22, kF)
      ry = lerp(ry, 0.3, kF)
      z += Math.sin(Math.PI * kF) * 4
    }

    // Pointer lean (spring) and rise.
    const dx = shared.uHeatPoint.value.x - p.x,
      dy = shared.uHeatPoint.value.y - p.y
    const near =
      Math.exp(-(dx * dx + dy * dy) / (scale * scale * 30)) *
      shared.uHeatAmt.value
    const gx = clamp(-dy * 0.18, -0.55, 0.55) * near,
      gy = clamp(dx * 0.18, -0.55, 0.55) * near
    const k = 70,
      c = 9
    b.tilt.vx += ((gx - b.tilt.x) * k - b.tilt.vx * c) * dt
    b.tilt.vy += ((gy - b.tilt.y) * k - b.tilt.vy * c) * dt
    b.tilt.x += b.tilt.vx * dt
    b.tilt.y += b.tilt.vy * dt
    z += near * scale * 0.8

    // Idle float.
    const idle = (1 - hx) * ik
    z += Math.sin(t * 0.9 + b.phase) * 0.12 * idle * scale
    rx += Math.sin(t * 0.6 + b.phase) * 0.03 * idle

    b.group.position.set(p.x, p.y, z)
    b.group.scale.setScalar(Math.max(scale, 0.0001))
    b.group.rotation.set(rx + b.tilt.x, ry + b.tilt.y, rz)

    // Heat uniforms.
    b.flash *= Math.exp(-dt * 1.6)
    const workHeat = ch === 1 ? workHover * kc : 0
    const footHeat = kF * kF * 0.95
    const warm =
      Math.max(ik * (1 - hx), kc * (1 - kF)) *
      (0.34 + 0.1 * Math.sin(t * 1.3 + b.phase))
    b.mat.userData.u.uFill.value = intro.fills[i].v
    b.mat.userData.u.uFlash.value = b.flash * 0.9
    b.mat.userData.u.uBlockHeat.value = lerp(
      b.mat.userData.u.uBlockHeat.value,
      Math.max(workHeat * 0.9, footHeat, warm),
      1 - Math.exp(-dt * 3)
    )
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.1 + b.phase)
    const seamBase =
      intro.seam *
      (0.85 + 0.3 * breathe) *
      (intro.done ? 1 : Math.min(1, intro.fills[i].v * 1.4))
    b.seamU.value = Math.max(
      seamBase * (1 - hx * (1 - kF)),
      b.flash * 1.2,
      kF * (0.75 + 0.25 * breathe),
      workHeat * 0.9
    )
    hottest = Math.max(hottest, near)
  })

  // Camera: slight pointer parallax and drift.
  const px = pointer.x / vw - 0.5,
    py = pointer.y / vh - 0.5
  camera.position.x = lerp(camera.position.x, px * 0.5, 1 - Math.exp(-dt * 2))
  camera.position.y = lerp(camera.position.y, -py * 0.35, 1 - Math.exp(-dt * 2))
  camera.lookAt(camera.position.x * 0.6, camera.position.y * 0.6, 0)
  key.position.x = -8 + Math.sin(t * 0.25) * 3
  scene.environmentIntensity = lerp(0.12, 0.95, ik)
  key.intensity = lerp(0.6, 2.6, ik)
  rim.intensity = lerp(0.3, 1.4, ik)

  // Cursor temperature readout.
  const temp = 20 + hottest * 1480 + intro.molten * 1500
  tempShown = lerp(tempShown, temp, 1 - Math.exp(-dt * 6))
  tempOut.textContent = `${Math.round(tempShown)} °C`

  composer.render(dt)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight, false)
  composer.setSize(innerWidth, innerHeight)
  bloom.setSize(innerWidth, innerHeight)
  finish.uniforms.uRes.value.set(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
})
