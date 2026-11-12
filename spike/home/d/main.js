// Spike D · Web — A's seven cast blocks are the nodes of a web of molten threads.
// A hot crawler runs it node to node; the pointer plucks the threads; chapters and
// the footer get crawled as they open. Built on spike A (cast material, structure).
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
scene.fog = new THREE.Fog(0x0d0d0e, 27, 52)
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

/* ================= THE WEB ================= */
// Deterministic random so screenshots are comparable between rounds.
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const rand = rng(7)
const narrow = innerWidth < 860
const S = 14 // segments per thread

// Nodes: 0..6 are the cast blocks, then the far (cold, deep) nodes of each cluster.
const nodes = blocks.map((b, i) => ({
  id: i,
  block: i,
  cluster: "block",
  heat: 0,
  lit: 0,
  litT: 0,
  burst: -1,
  pos: new THREE.Vector3(),
  sx: 0,
  sy: 0,
}))
const clusters = {
  hero: {
    count: 50,
    rx: [-0.9, 0.46],
    ry: [-0.64, 0.64],
    avoid: [0.15, 0.25],
    bias: 0,
  },
  ch0: {
    count: 26,
    rx: [-0.07, 0.98],
    ry: [-0.62, 0.62],
    avoid: [0.05, 0.1],
    bias: 1.5,
  },
  ch1: {
    count: 26,
    rx: [-0.07, 0.98],
    ry: [-0.62, 0.62],
    avoid: [0.05, 0.1],
    bias: 1.5,
  },
  ch2: {
    count: 26,
    rx: [-0.07, 0.98],
    ry: [-0.62, 0.62],
    avoid: [0.05, 0.1],
    bias: 1.5,
  },
  foot: {
    count: 36,
    rx: [-0.8, 0.42],
    ry: [-0.62, 0.62],
    avoid: [0.15, 0.26],
    bias: 0,
  },
}
for (const [name, c] of Object.entries(clusters)) {
  const n = Math.round(c.count * (narrow ? 0.55 : 1))
  const minD =
    Math.sqrt(
      ((c.rx[1] - c.rx[0]) * innerWidth * (c.ry[1] - c.ry[0]) * innerHeight) / n
    ) * 0.62
  c.ids = []
  let tries = 0
  while (c.ids.length < n && tries++ < 4000) {
    let u = rand()
    if (c.bias) u = Math.pow(u, c.bias)
    const x = lerp(c.rx[0], c.rx[1], u),
      y = lerp(c.ry[0], c.ry[1], rand())
    if (Math.abs(x) < c.avoid[0] && Math.abs(y) < c.avoid[1] && rand() > 0.15)
      continue
    let ok = true
    for (const id of c.ids) {
      const o = nodes[id]
      if (
        Math.hypot((o.rel.x - x) * innerWidth, (o.rel.y - y) * innerHeight) <
        minD
      ) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const r = Math.hypot(x * 1.4, y)
    const z = -2.6 - rand() * 11 * clamp(0.4 + r)
    const id = nodes.length
    nodes.push({
      id,
      cluster: name,
      rel: { x, y },
      z,
      size: 0.1 + rand() * 0.14,
      heat: 0,
      lit: 0,
      litT: 0,
      burst: -1,
      pos: new THREE.Vector3(),
      sx: 0,
      sy: 0,
      rx: rand() * 0.6 - 0.3,
      ry: rand() * 0.8,
      spin: (rand() - 0.5) * 0.3,
    })
    c.ids.push(id)
  }
}

// Edges: every far node to its 3 nearest in its cluster; the logo's own threads; the
// chain that runs chapter to chapter; blocks attached to the clusters they visit;
// long strands between clusters so the web runs down the whole page.
const edges = []
const edgeKey = new Set()
function addEdge(a, b, kind, cluster, base, width) {
  if (a === b) return -1
  const k = a < b ? `${a}-${b}` : `${b}-${a}`
  if (edgeKey.has(k)) return [...edgeKey].indexOf(k)
  edgeKey.add(k)
  edges.push({
    a,
    b,
    kind,
    cluster,
    base,
    width,
    d: new Float32Array(S + 1),
    v: new Float32Array(S + 1),
    dz: new Float32Array(S + 1),
    vz: new Float32Array(S + 1),
    heat: new Float32Array(S + 1),
    P: Array.from({ length: S + 1 }, () => new THREE.Vector3()),
    n: new THREE.Vector3(),
    alpha: 1,
    cool: 0,
    phase: rand() * 6.28,
    len: 1,
    sa: { x: 0, y: 0 },
    sb: { x: 0, y: 0 },
  })
  return edges.length - 1
}
const relPx = (n) => ({ x: n.rel.x * innerWidth, y: n.rel.y * innerHeight })
for (const [name, c] of Object.entries(clusters)) {
  for (const id of c.ids) {
    const p = relPx(nodes[id])
    const near = c.ids
      .filter((o) => o !== id)
      .map((o) => {
        const q = relPx(nodes[o])
        return [Math.hypot(q.x - p.x, q.y - p.y), o]
      })
      .sort((a, b) => a[0] - b[0])
    for (let k = 0; k < 3 && k < near.length; k++)
      addEdge(id, near[k][1], "web", name, 0.085, 0.026)
  }
}
const logoDist = (i, j) =>
  Math.hypot(
    logoDiamonds[i][0] - logoDiamonds[j][0],
    logoDiamonds[i][1] - logoDiamonds[j][1]
  )
for (let i = 0; i < 7; i++)
  for (let j = i + 1; j < 7; j++)
    if (logoDist(i, j) < 4.3) addEdge(i, j, "logo", "block", 0.5, 0.075)
const chainPairs = [
  [3, 0],
  [0, 1],
  [1, 2],
]
const chainEdge = chainPairs.map(([a, b]) =>
  addEdge(a, b, "chain", "block", 0.42, 0.06)
)
// Blocks → nearest nodes of a cluster, measured from where the block sits in it.
function attach(block, cluster, at, k, kind) {
  const ids = clusters[cluster].ids
  const near = ids
    .map((o) => {
      const q = nodes[o].rel
      return [
        Math.hypot((q.x - at.x) * innerWidth, (q.y - at.y) * innerHeight),
        o,
      ]
    })
    .sort((a, b) => a[0] - b[0])
  for (let m = 0; m < k && m < near.length; m++)
    addEdge(block, near[m][1], kind, cluster, 0.22, 0.04)
}
const logoRel = (i, sizeFracH) => ({
  x: ((logoDiamonds[i][0] - 5) / 10) * sizeFracH * (innerHeight / innerWidth),
  y: ((logoDiamonds[i][1] - 5) / 10) * sizeFracH,
})
for (let i = 0; i < 7; i++) attach(i, "hero", logoRel(i, 0.6), 2, "attach-hero")
for (let c = 0; c < 3; c++)
  attach(c, `ch${c}`, { x: 0, y: 0 }, 4, `attach-ch${c}`)
for (let i = 0; i < 7; i++) attach(i, "foot", logoRel(i, 0.6), 2, "attach-foot")
const order = ["hero", "ch0", "ch1", "ch2", "foot"]
for (let k = 0; k < order.length - 1; k++) {
  const lo = clusters[order[k]].ids
    .slice()
    .sort((a, b) => nodes[b].rel.y - nodes[a].rel.y)
    .slice(0, 3)
  const hi = clusters[order[k + 1]].ids
    .slice()
    .sort((a, b) => nodes[a].rel.y - nodes[b].rel.y)
    .slice(0, 3)
  lo.forEach((a, m) => addEdge(a, hi[m], "link", order[k + 1], 0.08, 0.024))
}
const adj = nodes.map(() => [])
edges.forEach((e, i) => {
  adj[e.a].push(i)
  adj[e.b].push(i)
})
const other = (e, n) => (e.a === n ? e.b : e.a)

/* ---- far nodes: instanced cast diamonds ---- */
const farIds = nodes.filter((n) => n.block === undefined).map((n) => n.id)
const farGeo = blockGeo.clone()
const farHeat = new THREE.InstancedBufferAttribute(
  new Float32Array(farIds.length),
  1
)
farGeo.setAttribute("aHeat", farHeat)
const farMat = new THREE.MeshPhysicalMaterial({
  color: 0x4c4e55,
  metalness: 0.92,
  roughness: 0.36,
  clearcoat: 0.2,
})
farMat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = shared.uTime
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      "#include <common>\nattribute float aHeat;\nvarying float vNH;\nvarying vec3 vLP;"
    )
    .replace(
      "#include <fog_vertex>",
      "#include <fog_vertex>\nvNH = aHeat;\nvLP = position;"
    )
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>\nvarying float vNH; varying vec3 vLP; uniform float uTime;\n${NOISE}`
    )
    .replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
{
  float n = fbm(vLP.xy*2.3 + vec2(0.0, -uTime*0.6) + vLP.z);
  float vn = fbm(vLP.xy*1.7 + vLP.z*0.9 + 3.0);
  float vein = 1.0 - smoothstep(0.0, 0.06, abs(vn - 0.5));
  float t = vNH * (0.45 + 0.35*n + 0.6*vein);
  float hot = smoothstep(0.25, 0.85, t);
  diffuseColor.rgb *= 1.0 - 0.85*hot;
  metalnessFactor = mix(metalnessFactor, 0.2, hot);
  totalEmissiveRadiance += heatRamp(t) * pow(t, 1.5) * 4.6;
}`
    )
}
const farMesh = new THREE.InstancedMesh(farGeo, farMat, farIds.length)
farMesh.frustumCulled = false
scene.add(farMesh)

/* ---- threads: continuous screen-facing ribbons (shared vertices, no joints) ---- */
const VPE = (S + 1) * 2
const NV = edges.length * VPE
const tgeo = new THREE.BufferGeometry()
const dyn = (n, k) =>
  new THREE.BufferAttribute(new Float32Array(n * k), k).setUsage(
    THREE.DynamicDrawUsage
  )
const tPos = dyn(NV, 3),
  tPrev = dyn(NV, 3),
  tNext = dyn(NV, 3),
  tH = dyn(NV, 1),
  tW = dyn(NV, 1),
  tAl = dyn(NV, 1)
const tSide = new THREE.BufferAttribute(new Float32Array(NV), 1)
for (let v = 0; v < NV; v++) tSide.array[v] = v % 2 ? 1 : -1
const tIdx = []
for (let ei = 0; ei < edges.length; ei++)
  for (let m = 0; m < S; m++) {
    const o = ei * VPE + m * 2
    tIdx.push(o, o + 2, o + 1, o + 2, o + 3, o + 1)
  }
tgeo.setIndex(tIdx)
Object.entries({
  position: tPos,
  aPrev: tPrev,
  aNext: tNext,
  aSide: tSide,
  aH: tH,
  aW: tW,
  aAl: tAl,
}).forEach(([k, v]) => tgeo.setAttribute(k, v))
const threadU = {
  uRes: { value: new THREE.Vector2(innerWidth * DPR, innerHeight * DPR) },
  uPtr: { value: new THREE.Vector2() },
  uPAmt: { value: 0 },
  uTime: shared.uTime,
  uDpr: { value: DPR },
  uMask: {
    value: Array.from({ length: 6 }, () => new THREE.Vector4(-1, -1, -1, -1)),
  },
}
const threadMat = new THREE.ShaderMaterial({
  uniforms: threadU,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
  attribute vec3 aPrev; attribute vec3 aNext; attribute float aSide; attribute float aH; attribute float aW; attribute float aAl;
  uniform vec2 uRes; uniform vec2 uPtr; uniform float uDpr;
  varying float vSide; varying float vHeat; varying float vAl; varying float vDepth; varying float vPD;
  void main(){
    mat4 pv = projectionMatrix * viewMatrix;
    vec4 c = pv * vec4(position, 1.0);
    vec4 p0 = pv * vec4(aPrev, 1.0), p1 = pv * vec4(aNext, 1.0);
    vec2 s0 = p0.xy / p0.w * 0.5 * uRes, s1 = p1.xy / p1.w * 0.5 * uRes;
    vec2 dir = s1 - s0; float L = length(dir); dir = L > 1e-4 ? dir / L : vec2(1.0, 0.0);
    vec2 nrm = vec2(-dir.y, dir.x);
    float focal = projectionMatrix[1][1] * uRes.y * 0.5;
    float wpx = aW * focal / c.w;
    float wd = max(wpx, 1.2 * uDpr);
    float hw = wd * 0.5 + uDpr;
    c.xy += nrm * aSide * hw / (0.5 * uRes) * c.w;
    gl_Position = c;
    vSide = aSide * hw / (wd * 0.5);
    vHeat = aH;
    vAl = aAl * clamp(wpx / wd, 0.3, 1.0);
    vDepth = c.w;
    vPD = length((c.xy / c.w * 0.5 + 0.5) * uRes - uPtr) / uDpr;
  }`,
  fragmentShader: /* glsl */ `
  uniform float uPAmt, uTime; uniform vec4 uMask[6]; varying float vSide; varying float vHeat; varying float vAl; varying float vDepth; varying float vPD;
  ${NOISE}
  void main(){
    float d = abs(vSide);
    float prof = 1.0 - smoothstep(0.45, 1.6, d);
    float h = vHeat + uPAmt * exp(-vPD * vPD / (170.0 * 170.0)) * 0.38;
    h = min(h, 1.15);
    vec3 cold = vec3(0.07, 0.074, 0.085);
    vec3 col = cold * (1.0 - smoothstep(0.08, 0.45, h)) + heatRamp(h) * pow(max(h, 0.0), 1.25) * 4.0;
    float fog = clamp(1.0 - (vDepth - 27.0) / 26.0, 0.22, 1.0);
    float mk = 1.0;
    for (int i = 0; i < 6; i++) {
      vec4 r = uMask[i];
      if (r.z < 0.0) continue;
      vec2 q = max(r.xy - gl_FragCoord.xy, gl_FragCoord.xy - r.zw);
      float o = max(q.x, q.y);
      mk = min(mk, mix(0.28, 1.0, smoothstep(-10.0, 40.0, o)));
    }
    gl_FragColor = vec4(col * prof * vAl * fog * mk, 1.0);
  }`,
})
const threads = new THREE.Mesh(tgeo, threadMat)
threads.frustumCulled = false
threads.renderOrder = 2
scene.add(threads)

/* ---- crawler sparks ---- */
const MAXP = 72
const sparkGeo = new THREE.BufferGeometry()
const sparkPos = new Float32Array(MAXP * 3),
  sparkSize = new Float32Array(MAXP)
sparkGeo.setAttribute(
  "position",
  new THREE.BufferAttribute(sparkPos, 3).setUsage(THREE.DynamicDrawUsage)
)
sparkGeo.setAttribute(
  "aSize",
  new THREE.BufferAttribute(sparkSize, 1).setUsage(THREE.DynamicDrawUsage)
)
const sparkMat = new THREE.ShaderMaterial({
  uniforms: {
    uScale: {
      value:
        innerHeight *
        DPR *
        0.5 *
        (1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))),
    },
  },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: `attribute float aSize; uniform float uScale; varying float vS;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / -mv.z; vS = aSize; }`,
  fragmentShader: `varying float vS;
    void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float g = exp(-r*r*7.0) * 0.9 + exp(-r*r*60.0) * 1.6;
      vec3 c = mix(vec3(1.0, 0.36, 0.08), vec3(1.0, 0.86, 0.62), exp(-r*r*30.0));
      gl_FragColor = vec4(c * g * 3.2, 1.0); }`,
})
const sparks = new THREE.Points(sparkGeo, sparkMat)
sparks.frustumCulled = false
sparks.renderOrder = 3
scene.add(sparks)

/* ---- crawlers: the runner, loader/burst crawls (breadth-first), pluck pulses ---- */
const crawlers = []
let burstSeq = 0
let crawled = 0
function spawn(edgeIdx, from, kind, extra = {}) {
  const live = crawlers.filter((c) => c.kind !== "pulse").length
  if (kind !== "pulse" && kind !== "runner" && kind !== "chain" && live > 46)
    return
  if (kind === "pulse" && crawlers.length - live > 110) return
  const e = edges[edgeIdx]
  crawlers.push({
    e: edgeIdx,
    from,
    to: other(e, from),
    t: 0,
    kind,
    speed: { runner: 7, loader: 15, burst: 13, pulse: 19, chain: 18 }[kind],
    amp: 1,
    ...extra,
  })
}
function visit(nid, amount = 1) {
  const n = nodes[nid]
  n.heat = Math.max(n.heat, amount)
  n.litT = 1
  if (n.block !== undefined)
    blocks[n.block].crawl = Math.max(blocks[n.block].crawl || 0, amount)
}
function burstFrom(nid, cluster, id) {
  nodes[nid].burst = id
  for (const ei of adj[nid]) {
    const o = other(edges[ei], nid)
    if (nodes[o].burst === id) continue
    if (cluster && nodes[o].cluster !== cluster) continue
    if (!cluster && !loaderSet.has(o)) continue
    if (edges[ei].alpha < 0.15) continue
    spawn(ei, nid, cluster ? "burst" : "loader", { cluster, burst: id })
  }
}
function pluckPulses(ei, k, amp) {
  const e = edges[ei]
  for (const dir of [-1, 1])
    crawlers.push({
      e: ei,
      from: dir < 0 ? e.b : e.a,
      to: dir < 0 ? e.a : e.b,
      t: dir < 0 ? 1 - k / S : k / S,
      kind: "pulse",
      speed: 19,
      amp,
    })
}
const onScreen = (n, m = 0.04) =>
  n.sx > -innerWidth * m &&
  n.sx < innerWidth * (1 + m) &&
  n.sy > -innerHeight * m &&
  n.sy < innerHeight * (1 + m)

function arrive(c) {
  const nid = c.to
  const n = nodes[nid]
  if (c.kind === "pulse") {
    n.heat = Math.max(n.heat, c.amp * 0.8)
    const amp = c.amp * 0.55
    if (amp > 0.16 && crawlers.length < 170)
      for (const ei of adj[nid])
        if (ei !== c.e && edges[ei].alpha > 0.2)
          crawlers.push({
            e: ei,
            from: nid,
            to: other(edges[ei], nid),
            t: 0,
            kind: "pulse",
            speed: 19,
            amp,
          })
    return false
  }
  crawled++
  visit(nid, c.kind === "runner" ? 1 : 0.9)
  // The landing makes the threads at this node tremble.
  for (const ei of adj[nid]) {
    const e = edges[ei]
    const k = e.a === nid ? 1 : S - 1
    e.v[k] += (rand() - 0.5) * 1.6
    e.vz[k] += (rand() - 0.5) * 1.2
  }
  if (c.kind === "loader" || c.kind === "burst") {
    burstFrom(nid, c.cluster, c.burst)
    return false
  }
  if (c.kind === "chain") {
    burstSeq++
    burstFrom(nid, c.cluster, burstSeq)
    return false
  }
  // runner: next thread — toward the pointer if it's active, otherwise wander, never straight back.
  let cand = adj[nid].filter(
    (ei) =>
      edges[ei].alpha > 0.35 &&
      other(edges[ei], nid) !== c.from &&
      onScreen(nodes[other(edges[ei], nid)])
  )
  if (!cand.length) cand = adj[nid].filter((ei) => edges[ei].alpha > 0.35)
  if (!cand.length) return false
  let pick
  if (pointerActive()) {
    pick = cand
      .map((ei) => {
        const o = nodes[other(edges[ei], nid)]
        return [
          Math.hypot(o.sx - pointer.x, o.sy - pointer.y) *
            (0.75 + 0.5 * rand()),
          ei,
        ]
      })
      .sort((a, b) => a[0] - b[0])[0][1]
  } else {
    const blocksFirst = cand.filter(
      (ei) => nodes[other(edges[ei], nid)].block !== undefined
    )
    pick =
      blocksFirst.length && rand() < 0.3
        ? blocksFirst[Math.floor(rand() * blocksFirst.length)]
        : cand[Math.floor(rand() * cand.length)]
  }
  c.e = pick
  c.from = nid
  c.to = other(edges[pick], nid)
  c.t = 0
  return true
}

/* ---------------- Pointer ---------------- */
const pointer = {
  x: innerWidth * 0.7,
  y: innerHeight * 0.5,
  px: innerWidth * 0.7,
  py: innerHeight * 0.5,
  last: -1e4,
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
const pointerActive = () =>
  intro.done && pointer.inside && performance.now() - pointer.last < 1800
const pointerWorld = new THREE.Vector3()
let workHover = 0
$("[data-projects]").addEventListener("pointerover", () => {
  workHover = 1
})
$("[data-projects]").addEventListener("pointerleave", () => {
  workHover = 0
})

/* ---------------- Intro: a crawl that lights the web, then it contracts ---------------- */
const intro = { k: 0, seam: 1.15, done: false, crawling: false, forced: 0 }
const countEl = $("[data-loader-count]"),
  barEl = $("[data-loader-bar]"),
  labelEl = $("[data-loader-label]"),
  tempEl = $("[data-loader-temp]")
const loaderSet = new Set([0, 1, 2, 3, 4, 5, 6, ...clusters.hero.ids])
const tl = gsap.timeline({ delay: 0.25 })
tl.call(
  () => {
    intro.crawling = true
    // Seed: the hero node nearest the middle-left of the screen.
    const seed = clusters.hero.ids
      .slice()
      .sort(
        (a, b) =>
          Math.hypot(nodes[a].rel.x + 0.42, nodes[a].rel.y) -
          Math.hypot(nodes[b].rel.x + 0.42, nodes[b].rel.y)
      )[0]
    visit(seed, 1)
    crawled++
    burstSeq++
    burstFrom(seed, null, burstSeq)
  },
  null,
  0
)
tl.to(intro, { forced: 1, duration: 2.5, ease: "none" }, 0)
tl.call(
  () => {
    labelEl.textContent = "Indexed"
    intro.crawling = false
    for (const id of loaderSet) nodes[id].litT = 1
  },
  null,
  2.45
)
tl.to(".loader", { opacity: 0, duration: 0.6, ease: "power2.out" }, 2.75)
tl.to(intro, { k: 1, duration: 1.3, ease: "expo.inOut" }, 2.5)
tl.to(intro, { seam: 0.42, duration: 1.3, ease: "power2.out" }, 2.7)
tl.to(
  ".hero .reveal > span",
  { y: 0, duration: 1.1, ease: "expo.out", stagger: 0.06 },
  3.05
)
tl.call(
  () => {
    intro.done = true
    document.body.classList.remove("is-loading")
    $(".loader").remove()
  },
  null,
  3.9
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
let scrolled = false
const tempOut = $("[data-temp]")
const proj = new THREE.Vector3()
const footState = { fired: false }
const dummy = new THREE.Object3D()
const tmpS = { x: 0, y: 0 }
const toScreen = (v, out) => {
  proj.copy(v).project(camera)
  out.x = (proj.x + 1) * 0.5 * innerWidth
  out.y = (1 - proj.y) * 0.5 * innerHeight
  return out
}
const chRails = [0, 1, 2].map((c) => anchors[`ch${c}`])
const maskEls = $$(
  ".hero__brand, .about__statement, .about__body, .stats, .contact__title, .contact__email, .project__title, .post"
)

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30)
  const t = clock.elapsedTime
  shared.uTime.value = t
  finish.uniforms.uTime.value = t
  shared.uMolten.value = 0

  const vw = innerWidth,
    vh = innerHeight
  const hero = rectOf($(".hero"))
  const heroLogo = rectOf(anchors.hero)
  const dock = rectOf(anchors.dock)
  const footer = rectOf(anchors.footer)
  const ik = intro.k
  const spreadS = Math.min(vw, vh) * 1.35
  const spreadRect = {
    x: lerp(heroLogo.x + heroLogo.w / 2, vw / 2, 0.45) - spreadS / 2,
    y: heroLogo.y + heroLogo.h / 2 - spreadS / 2,
    w: spreadS,
    h: spreadS,
  }
  const hx = easeInOut(clamp(-hero.y / (hero.h * 0.75)))
  const kF = easeInOut(clamp((vh * 1.0 - footer.y) / (vh * 0.75)))
  const isScrolled = hx > 0.95
  if (isScrolled !== scrolled) {
    scrolled = isScrolled
    document.body.classList.toggle("is-scrolled", scrolled)
  }

  // Pointer heat (block metal) — as in A.
  const active = pointerActive()
  pointer.speed *= Math.exp(-dt * 1.8)
  toWorld(pointer.x, pointer.y, pointerWorld)
  shared.uHeatPoint.value.lerp(pointerWorld, 1 - Math.exp(-dt * 7))
  const heatGoal = active ? 0.5 + 0.5 * pointer.speed : 0
  shared.uHeatAmt.value = lerp(
    shared.uHeatAmt.value,
    heatGoal,
    1 - Math.exp(-dt * (heatGoal > shared.uHeatAmt.value ? 4 : 1.4))
  )
  shared.uHeatR.value = 1.6 + 0.9 * pointer.speed
  fill.position.set(shared.uHeatPoint.value.x, shared.uHeatPoint.value.y, 2.5)
  fill.intensity = shared.uHeatAmt.value * 40
  {
    let mi = 0
    for (const el of maskEls) {
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > vh || mi >= 6) continue
      threadU.uMask.value[mi++].set(
        r.left * DPR,
        (vh - r.bottom) * DPR,
        r.right * DPR,
        (vh - r.top) * DPR
      )
    }
    for (; mi < 6; mi++) threadU.uMask.value[mi].set(-1, -1, -1, -1)
  }
  threadU.uPtr.value.set(pointer.x * DPR, (vh - pointer.y) * DPR)
  threadU.uPAmt.value = shared.uHeatAmt.value

  const kcs = []
  blocks.forEach((b, i) => {
    // 1. spread in the web (loader) → hero logo
    logoSlot(spreadRect, i, sA)
    logoSlot(heroLogo, i, sB)
    sA.scale = sB.scale * 0.62
    const p = sA.pos.lerp(sB.pos, ik)
    let scale = lerp(sA.scale, sB.scale, ik)
    let rx = lerp(-0.1 - t * 0.012, -0.26, ik),
      ry = lerp(0.16 + t * 0.02, 0.36, ik),
      rz = 0
    let z = lerp(-1.5 + (i % 3) * 0.8, 0, ik)
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
    const ch = CHAPTER_OF[i]
    let kc = 0
    if (ch >= 0) {
      const ar = rectOf(chRails[ch])
      kc = easeInOut(clamp((vh * 0.98 - ar.y) / (vh * 0.5)))
      kcs[ch] = kc
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
        // The crawler comes down the chain thread into this chapter, then crawls its web.
        const [from] = chainPairs[ch]
        spawn(chainEdge[ch], from, "chain", { cluster: `ch${ch}` })
      }
      if (kc < 0.6) b.arrived = false
    }
    if (kF > 0) {
      logoSlot(footer, i, sC)
      p.lerp(sC.pos, kF)
      scale = lerp(scale, sC.scale, kF)
      rx = lerp(rx, -0.22, kF)
      ry = lerp(ry, 0.3, kF)
      z += Math.sin(Math.PI * kF) * 4
    }
    const dx = shared.uHeatPoint.value.x - p.x,
      dy = shared.uHeatPoint.value.y - p.y
    const near =
      Math.exp(-(dx * dx + dy * dy) / (scale * scale * 30)) *
      shared.uHeatAmt.value
    const gx = clamp(-dy * 0.18, -0.55, 0.55) * near,
      gy = clamp(dx * 0.18, -0.55, 0.55) * near
    b.tilt.vx += ((gx - b.tilt.x) * 70 - b.tilt.vx * 9) * dt
    b.tilt.vy += ((gy - b.tilt.y) * 70 - b.tilt.vy * 9) * dt
    b.tilt.x += b.tilt.vx * dt
    b.tilt.y += b.tilt.vy * dt
    z += near * scale * 0.8
    const idle = (1 - hx) * ik
    z += Math.sin(t * 0.9 + b.phase) * 0.12 * idle * scale
    rx += Math.sin(t * 0.6 + b.phase) * 0.03 * idle
    b.group.position.set(p.x, p.y, z)
    b.group.scale.setScalar(Math.max(scale, 0.0001))
    b.group.rotation.set(rx + b.tilt.x, ry + b.tilt.y, rz)

    const n = nodes[i]
    b.flash *= Math.exp(-dt * 1.6)
    b.crawl = (b.crawl || 0) * Math.exp(-dt * 2.2)
    const workHeat = ch === 1 ? workHover * kc : 0
    const footHeat = kF * kF * 0.95
    const warm =
      Math.max(ik * (1 - hx), kc * (1 - kF)) *
      (0.34 + 0.1 * Math.sin(t * 1.3 + b.phase))
    const litWarm = n.lit * 0.42 * (1 - ik)
    b.mat.userData.u.uFill.value = 1
    b.mat.envMapIntensity = lerp(1, 0.4, kc * (1 - kF))
    b.mat.userData.u.uFlash.value = Math.max(b.flash * 0.5, b.crawl * 0.38)
    b.mat.userData.u.uBlockHeat.value = lerp(
      b.mat.userData.u.uBlockHeat.value,
      Math.max(workHeat * 0.9, footHeat, warm, litWarm),
      1 - Math.exp(-dt * 3)
    )
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.1 + b.phase)
    const seamBase =
      intro.seam * (0.85 + 0.3 * breathe) * (intro.done ? 1 : n.lit)
    b.seamU.value = Math.max(
      seamBase * (1 - hx * (1 - kF)),
      b.flash * 0.75,
      b.crawl * 0.55,
      kF * (0.75 + 0.25 * breathe),
      workHeat * 0.9
    )
    n.pos.copy(b.group.position)
    n.ws = clamp(scale / Math.max(sB.scale, 1e-3), 0.25, 1)
    toScreen(n.pos, tmpS)
    n.sx = tmpS.x
    n.sy = tmpS.y
  })

  // Far nodes: anchored to their section, deeper ones lag (parallax), the hero web contracts after the crawl.
  const anchorsPx = {
    hero: {
      x: heroLogo.x + heroLogo.w / 2,
      y: heroLogo.y + heroLogo.h / 2,
      s: lerp(1.28, 1, ik),
    },
    foot: { x: footer.x + footer.w / 2, y: footer.y + footer.h / 2, s: 1 },
  }
  chRails.forEach((el, c) => {
    const r = rectOf(el)
    anchorsPx[`ch${c}`] = { x: r.x + r.w / 2, y: r.y + r.h / 2, s: 1 }
  })
  const H = viewH(),
    W = H * (vw / vh)
  farIds.forEach((id, j) => {
    const n = nodes[id]
    const a = anchorsPx[n.cluster]
    const par = 1 - 0.42 * clamp(-n.z / 13)
    n.sx = a.x + n.rel.x * vw * a.s
    n.sy = vh / 2 + (a.y - vh / 2) * par + n.rel.y * vh * a.s
    const ds = (CAM_D - n.z) / CAM_D
    n.pos.set((n.sx / vw - 0.5) * W * ds, -(n.sy / vh - 0.5) * H * ds, n.z)
    const pd = Math.hypot(n.sx - pointer.x, n.sy - pointer.y)
    n.heat = Math.max(
      n.heat * Math.exp(-dt * 1.3),
      n.lit * 0.2,
      shared.uHeatAmt.value * Math.exp(-(pd * pd) / (170 * 170)) * 0.75
    )
    n.lit = lerp(n.lit, n.litT, 1 - Math.exp(-dt * 5))
    dummy.position.copy(n.pos)
    dummy.rotation.set(
      -0.25 + n.rx + Math.sin(t * 0.4 + id) * 0.1,
      0.3 + n.ry + t * n.spin,
      0
    )
    dummy.scale.setScalar(n.size)
    dummy.updateMatrix()
    farMesh.setMatrixAt(j, dummy.matrix)
    farHeat.array[j] = n.heat
  })
  for (let i = 0; i < 7; i++) {
    const n = nodes[i]
    n.heat *= Math.exp(-dt * 1.3)
    n.lit = lerp(n.lit, n.litT, 1 - Math.exp(-dt * 5))
  }
  farMesh.instanceMatrix.needsUpdate = true
  farHeat.needsUpdate = true

  // Footer: every node gets crawled once you arrive.
  if (kF > 0.85 && !footState.fired) {
    footState.fired = true
    burstSeq++
    for (let i = 0; i < 7; i++) burstFrom(i, "foot", burstSeq)
  }
  if (kF < 0.4) footState.fired = false

  // Threads: visibility, geometry (sag, breeze, vibration), heat.
  const kc0 = kcs[0] || 0,
    kc1 = kcs[1] || 0,
    kc2 = kcs[2] || 0
  const pmoved = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py)
  const pvx = (pointer.x - pointer.px) * (H / vh),
    pvy = -(pointer.y - pointer.py) * (H / vh)
  const canPluck = intro.done && pmoved > 1.5
  let j = 0
  for (let ei = 0; ei < edges.length; ei++) {
    const e = edges[ei]
    const A = nodes[e.a].pos,
      B = nodes[e.b].pos
    let al = 1
    if (e.kind === "attach-hero") al = 1 - hx
    else if (e.kind === "attach-ch0") al = kc0 * (1 - kF)
    else if (e.kind === "attach-ch1") al = kc1 * (1 - kF)
    else if (e.kind === "attach-ch2") al = kc2 * (1 - kF)
    else if (e.kind === "attach-foot") al = kF
    e.alpha = al
    const len = A.distanceTo(B)
    e.len = Math.max(len, 0.001)
    e.n.set(-(B.y - A.y), B.x - A.x, 0).normalize()
    // Pluck: pointer crossing the thread on screen.
    e.cool -= dt
    if (canPluck && al > 0.2) {
      toScreen(A, e.sa)
      toScreen(B, e.sb)
      const sx = e.sb.x - e.sa.x,
        sy = e.sb.y - e.sa.y,
        L2 = sx * sx + sy * sy
      if (L2 > 16) {
        const u = clamp(
          ((pointer.x - e.sa.x) * sx + (pointer.y - e.sa.y) * sy) / L2,
          0.04,
          0.96
        )
        const qx = e.sa.x + sx * u - pointer.x,
          qy = e.sa.y + sy * u - pointer.y
        if (qx * qx + qy * qy < 22 * 22) {
          const k = Math.round(u * S)
          const imp = clamp((pvx * e.n.x + pvy * e.n.y) * 9, -6, 6)
          for (let m = 1; m < S; m++) {
            const g = Math.exp(-((m - k) ** 2) / 3)
            e.v[m] += imp * g
            e.vz[m] += Math.abs(imp) * 0.5 * g
          }
          e.heat[k] = Math.max(e.heat[k], 0.9)
          if (e.cool <= 0) {
            e.cool = 0.3
            pluckPulses(ei, k, clamp(0.6 + pointer.speed * 0.6, 0, 1.1))
          }
        }
      }
    }
    // Wave on the thread (two substeps, fixed ends), heat decays.
    const lim = e.len * 0.16
    for (let sub = 0; sub < 2; sub++) {
      const h = dt / 2
      for (let m = 1; m < S; m++) {
        e.v[m] +=
          (1900 * (e.d[m - 1] - 2 * e.d[m] + e.d[m + 1]) - 2.6 * e.v[m]) * h
        e.vz[m] +=
          (1900 * (e.dz[m - 1] - 2 * e.dz[m] + e.dz[m + 1]) - 2.6 * e.vz[m]) * h
      }
      for (let m = 1; m < S; m++) {
        e.d[m] = clamp(e.d[m] + e.v[m] * h, -lim, lim)
        e.dz[m] = clamp(e.dz[m] + e.vz[m] * h, -lim, lim)
      }
    }
    const decay = Math.exp(-dt * (intro.done ? 1.5 : 1.1))
    for (let m = 0; m <= S; m++) e.heat[m] *= decay
    const sag = e.len * (e.kind === "logo" ? 0.035 : 0.06)
    for (let m = 0; m <= S; m++) {
      const u = m / S,
        bell = 4 * u * (1 - u)
      const breeze =
        Math.sin(t * 1.1 + e.phase + u * 3.0) * e.len * 0.008 * bell
      e.P[m].lerpVectors(A, B, u)
      e.P[m].y -= sag * bell
      e.P[m].x += e.n.x * (e.d[m] + breeze)
      e.P[m].y += e.n.y * (e.d[m] + breeze)
      e.P[m].z += e.dz[m]
    }
    const litK = Math.min(nodes[e.a].lit, nodes[e.b].lit)
    const wEdge = e.width * Math.min(nodes[e.a].ws ?? 1, nodes[e.b].ws ?? 1)
    let base = e.base * litK
    if (e.kind === "logo" || e.kind === "chain")
      base *=
        (0.82 + 0.18 * Math.sin(t * 1.3 + e.phase)) *
        clamp(5 / e.len, e.kind === "chain" ? 0.6 : 0.22, 1)
    if (e.cluster === "foot") base = Math.max(base, (0.12 + 0.26 * litK) * kF)
    for (let m = 0; m <= S; m++) {
      const P = e.P[m],
        Pp = e.P[m > 0 ? m - 1 : 0],
        Pn = e.P[m < S ? m + 1 : S]
      const hv = base + e.heat[m]
      for (let sd = 0; sd < 2; sd++, j++) {
        tPos.array[j * 3] = P.x
        tPos.array[j * 3 + 1] = P.y
        tPos.array[j * 3 + 2] = P.z
        tPrev.array[j * 3] = Pp.x
        tPrev.array[j * 3 + 1] = Pp.y
        tPrev.array[j * 3 + 2] = Pp.z
        tNext.array[j * 3] = Pn.x
        tNext.array[j * 3 + 1] = Pn.y
        tNext.array[j * 3 + 2] = Pn.z
        tH.array[j] = hv
        tW.array[j] = wEdge
        tAl.array[j] = al
      }
    }
  }
  pointer.px = pointer.x
  pointer.py = pointer.y

  // Crawlers move along the threads and leave heat behind them.
  if (intro.done && !crawlers.some((c) => c.kind === "runner")) {
    const startN =
      [0, 1, 2, 3, 4, 5, 6].map((i) => nodes[i]).find((n) => onScreen(n)) ||
      nodes.find((n) => onScreen(n) && adj[n.id].length)
    if (startN) {
      const cand = adj[startN.id].filter((ei) => edges[ei].alpha > 0.35)
      if (cand.length)
        spawn(cand[Math.floor(rand() * cand.length)], startN.id, "runner")
    }
  }
  let np = 0
  for (let ci = crawlers.length - 1; ci >= 0; ci--) {
    const c = crawlers[ci]
    const e = edges[c.e]
    const sp =
      c.kind === "runner" ? c.speed * (pointerActive() ? 1.5 : 1) : c.speed
    c.t += (sp * dt) / e.len
    let alive = true
    if (c.t >= 1) alive = arrive(c)
    if (!alive) {
      crawlers.splice(ci, 1)
      continue
    }
    const ce = edges[c.e]
    const u = c.from === ce.a ? c.t : 1 - c.t
    const f = u * S,
      m0 = Math.min(S - 1, Math.floor(f)),
      fr = f - m0
    const amp =
      c.kind === "pulse"
        ? c.amp
        : c.kind === "loader"
          ? 0.62
          : c.kind === "burst"
            ? 0.75
            : 1
    ce.heat[m0] = Math.max(ce.heat[m0], amp * (1 - fr))
    ce.heat[m0 + 1] = Math.max(
      ce.heat[m0 + 1],
      amp * fr + (c.kind === "pulse" ? 0 : 0.2)
    )
    if (c.kind !== "pulse" && np < MAXP) {
      const P = ce.P[m0],
        Q = ce.P[m0 + 1]
      sparkPos[np * 3] = lerp(P.x, Q.x, fr)
      sparkPos[np * 3 + 1] = lerp(P.y, Q.y, fr)
      sparkPos[np * 3 + 2] = lerp(P.z, Q.z, fr) + 0.05
      sparkSize[np] = c.kind === "runner" ? 0.95 : 0.6
      np++
    }
  }
  sparkGeo.setDrawRange(0, np)
  sparkGeo.attributes.position.needsUpdate = true
  sparkGeo.attributes.aSize.needsUpdate = true
  tPos.needsUpdate =
    tPrev.needsUpdate =
    tNext.needsUpdate =
    tH.needsUpdate =
    tW.needsUpdate =
    tAl.needsUpdate =
      true

  // Loader readout.
  if (!intro.done && countEl.isConnected) {
    let lit = 0
    for (const id of loaderSet) if (nodes[id].litT) lit++
    const frac = Math.max(
      Math.min(1, lit / (loaderSet.size * 0.9)),
      intro.forced * 0.0
    )
    const shown = intro.k > 0 ? 1 : Math.min(frac, 0.15 + intro.forced * 0.85)
    countEl.textContent = String(Math.round(shown * 100)).padStart(3, "0")
    barEl.style.transform = `scaleX(${shown})`
    tempEl.textContent = `${crawled} nodes`
    // If the crawl stalls, reseed from a lit node that still has dark neighbours.
    if (
      intro.crawling &&
      !crawlers.some((c) => c.kind === "loader") &&
      lit < loaderSet.size
    ) {
      const lid = [...loaderSet].find(
        (id) =>
          nodes[id].litT &&
          adj[id].some(
            (ei) =>
              !nodes[other(edges[ei], id)].litT &&
              loaderSet.has(other(edges[ei], id))
          )
      )
      if (lid !== undefined) {
        burstSeq++
        for (const id of loaderSet)
          if (nodes[id].litT) nodes[id].burst = burstSeq
        burstFrom(lid, null, burstSeq)
      }
    }
  }

  // Camera: slight pointer parallax and drift.
  const px = pointer.x / vw - 0.5,
    py = pointer.y / vh - 0.5
  camera.position.x = lerp(camera.position.x, px * 0.5, 1 - Math.exp(-dt * 2))
  camera.position.y = lerp(camera.position.y, -py * 0.35, 1 - Math.exp(-dt * 2))
  camera.lookAt(camera.position.x * 0.6, camera.position.y * 0.6, 0)
  key.position.x = -8 + Math.sin(t * 0.25) * 3
  scene.environmentIntensity = lerp(0.25, 0.95, ik)
  key.intensity = lerp(1.0, 2.6, ik)
  rim.intensity = lerp(0.5, 1.4, ik)

  tempOut.textContent = String(crawled).padStart(3, "0")

  composer.render(dt)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight, false)
  composer.setSize(innerWidth, innerHeight)
  bloom.setSize(innerWidth, innerHeight)
  finish.uniforms.uRes.value.set(innerWidth, innerHeight)
  threadU.uRes.value.set(innerWidth * DPR, innerHeight * DPR)
  sparkMat.uniforms.uScale.value =
    innerHeight * DPR * 0.5 * (1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)))
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
})
