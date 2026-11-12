// Spike C — Prism. One fixed WebGL canvas behind the DOM. Every [data-gl] text is
// drawn into the scene (DOM copy stays transparent for selection and screen readers),
// so the glass prism and its seven shards refract real page typography.
import * as THREE from "three"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js"
import { OutputPass } from "three/addons/postprocessing/OutputPass.js"
import gsap from "gsap"
import { content, logoDiamonds as L } from "/shared/content.js"

/* ------------------------------------------------------------------ DOM */
const app = document.getElementById("app")
const dots = (form, from, n) =>
  `<span class="dots">${Array.from({ length: n }, (_, k) => `<i class="anchor" data-form="${form}" data-shard="${from + k}" style="inset-inline-start:${k * 28}px;inset-block-start:0;width:20px"></i>`).join("")}</span>`
const head = (form, n, label, title, nDots, dotFrom) => `
  <div class="chapter__head">
    <span class="chapter__index" data-gl data-gl-stroke aria-hidden="true">${n}</span>
    <i class="anchor a-index" data-form="${form}" data-shard="0"></i>
    <p class="chapter__label mono">(${n}) ${label} ${dots(form, dotFrom, nDots)}</p>
    <h2 class="chapter__title" data-gl>${title}</h2>
  </div>`

app.innerHTML = `
<section class="hero" id="top">
  <div class="hero__pin">
    <div class="hero__meta mono"><span>${content.location} · 51.16° N 71.47° E</span><span>Available for work — 2026</span></div>
    <h1 class="hero__brand" data-gl data-gl-hero>Web<br>Runner</h1>
    <div class="hero__prism" aria-hidden="true"></div>
    <div class="hero__logo" aria-hidden="true"></div>
    <div class="hero__foot">
      <div><p class="hero__name">${content.name}</p><p class="hero__headline">${content.headline}</p></div>
      <div class="hero__actions"><a class="btn btn--primary" href="#">View CV <i></i></a><a class="btn" href="#projects">Projects</a></div>
      <p class="hero__scroll mono"><b>01 / 04</b><span>Scroll to break the prism ↓</span></p>
    </div>
  </div>
</section>

<section class="chapter" id="about">
  ${head("about", "01", "About — who builds this", "Built fast", 3, 4)}
  <div class="about__body">
    <div class="about__side mono"><p>${content.location}</p><p>React · TypeScript · Cloudflare Workers · WebGL</p></div>
    <p class="about__statement">I build interfaces that load in a blink <em>and hold up under real traffic</em> — from the first pixel to the edge cache.</p>
    <dl class="stats">
      ${content.stats.map(([v, l], k) => `<div class="stat"><dt class="mono">${l}</dt><dd data-gl>${v}<i class="anchor" data-form="about" data-shard="${k + 1}"></i></dd></div>`).join("")}
    </dl>
  </div>
</section>

<section class="chapter" id="projects">
  ${head("projects", "02", "Selected work — 2023–2026", "Work", 2, 5)}
  <div class="projects">
    ${content.projects
      .map(
        (p, k) => `
      <a class="project" href="#">
        <span class="project__i mono">0${k + 1}</span>
        <span class="project__title" data-gl data-gl-project>${p.title}</span>
        <span class="project__meta mono"><span>${p.tags.join(" · ")}</span><p>${p.text}</p></span>
        <span class="project__year mono">${p.year}</span>
        <span class="project__arrow" aria-hidden="true">→</span>
        <i class="anchor" data-form="projects" data-shard="${k + 1}"></i>
      </a>`
      )
      .join("")}
  </div>
</section>

<section class="chapter" id="posts">
  ${head("posts", "03", "Writing — notes from the edge", "Writing", 3, 4)}
  <div class="posts">
    ${content.posts
      .map(
        (p, k) => `
      <a class="post" href="#">
        <span class="post__date mono">${p.date} · 0${k + 1}</span>
        <span class="post__body"><h3 class="post__title" data-gl>${p.title}</h3><p class="post__text">${p.text}</p><i class="anchor" data-form="posts" data-shard="${k + 1}"></i></span>
        <span class="post__more mono">Read →</span>
      </a>`
      )
      .join("")}
  </div>
</section>

<footer class="chapter contact" id="contact">
  <p class="chapter__label mono">(04) Contact — let's build something fast</p>
  <div class="contact__big">
    <span class="contact__talk" data-gl>Let's talk</span>
    <div class="contact__logo" aria-hidden="true"></div>
    <div class="contact__mail-wrap"><a class="contact__mail" href="mailto:${content.email}" data-gl>${content.email}</a><span class="mono">Reply within a day</span></div>
  </div>
  <div class="contact__foot mono"><span>© 2026 ${content.name}</span><nav><a href="#">GitHub</a><a href="#">LinkedIn</a><a href="#">Telegram</a></nav><a href="#top">Back to top ↑</a></div>
</footer>`

/* ------------------------------------------------------------ renderer */
const canvas = document.getElementById("gl")
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
})
renderer.toneMapping = THREE.NoToneMapping
renderer.outputColorSpace = THREE.SRGBColorSpace
const DPR = Math.min(window.devicePixelRatio, 1.5)
renderer.setPixelRatio(DPR)

const scene = new THREE.Scene()
const FOV = 30
const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 20000)
let vw = innerWidth,
  vh = innerHeight,
  D = 1

const rt = new THREE.WebGLRenderTarget(1, 1, {
  type: THREE.HalfFloatType,
  samples: 4,
})
const composer = new EffectComposer(renderer, rt)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.35, 1.15)
composer.addPass(bloom)
composer.addPass(new OutputPass())

/* -------------------------------------------- environment: dark studio */
{
  const env = new THREE.Scene()
  env.background = new THREE.Color(0x1d1e22)
  const panel = (w, h, hex, k, pos, rotY = 0, rotX = 0) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(hex).multiplyScalar(k),
        side: THREE.DoubleSide,
      })
    )
    m.position.set(...pos)
    m.rotation.set(rotX, rotY, 0)
    env.add(m)
  }
  panel(5, 0.5, 0xffffff, 1.8, [0, 5, 0.5], 0, Math.PI / 2) // top softbox
  panel(0.12, 6, 0xffffff, 2.4, [3.2, 0, -5]) // thin sparkle strips
  panel(0.12, 6, 0xffffff, 2.4, [-3.4, 0.5, -4.6])
  panel(0.35, 7, 0xffffff, 5, [-5, 0, 1.5], Math.PI / 2) // left strip
  panel(0.25, 6, 0xffffff, 3, [-2, 0, -5]) // back strips
  panel(0.25, 6, 0xffffff, 3, [2.2, 0, -5])
  panel(0.5, 6, 0xb84530, 5, [5, 0.4, 0.5], -Math.PI / 2) // rust strip right
  panel(4, 0.25, 0xffffff, 2, [0, -4.5, 3], 0, Math.PI / 2) // floor bounce
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(env, 0.015).texture
}

/* ----------------------------------------------------- shared backdrop */
const lin = (hex) => new THREE.Color(hex)
const common = {
  uView: { value: new THREE.Vector2(vw, vh) },
  uPointer: { value: new THREE.Vector2(vw * 0.6, vh * 0.5) },
  uScroll: { value: 0 },
  uTime: { value: 0 },
  uFlash: { value: 0 },
  uFlashPos: { value: new THREE.Vector2() },
  uBg: { value: lin(0x0d0d0e) },
  uBgLift: { value: lin(0x1a1b1f) },
  uDot: { value: lin(0x3a3d44) },
  uRust: { value: lin(0xb84530) },
}
const VERT = /* glsl */ `
varying vec2 vUv; varying vec2 vWorld;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }`
const BACKDROP = /* glsl */ `
uniform vec2 uView; uniform vec2 uPointer; uniform float uScroll; uniform float uTime; uniform float uFlash; uniform vec2 uFlashPos;
uniform vec3 uBg; uniform vec3 uBgLift; uniform vec3 uDot; uniform vec3 uRust;
varying vec2 vUv; varying vec2 vWorld;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 backdrop(){
  vec2 s = vec2(vWorld.x + uView.x * 0.5, uView.y * 0.5 - vWorld.y);
  float r = length((s - vec2(uView.x * 0.62, uView.y * 0.5)) / uView.y);
  vec3 col = mix(uBgLift, uBg, smoothstep(0.0, 0.95, r));
  vec2 g = mod(vec2(s.x, s.y + uScroll), 28.0) - 14.0;
  float dt = 1.0 - smoothstep(0.45, 1.25, length(g));
  col = mix(col, uDot, dt * 0.8);
  float pr = length(s - uPointer) / (uView.y * 0.5);
  col += uRust * 0.075 * exp(-pr * pr * 2.4);
  float fr = length(s - uFlashPos) / (uView.y * 0.7);
  col += uRust * uFlash * 0.5 * exp(-fr * fr * 2.5);
  col += (hash(s + fract(uTime)) - 0.5) / 255.0;
  return col;
}`

const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.ShaderMaterial({
    uniforms: common,
    vertexShader: VERT,
    fragmentShader:
      BACKDROP + `void main(){ gl_FragColor = vec4(backdrop(), 1.0); }`,
    depthTest: false,
    depthWrite: false,
  })
)
backdrop.position.z = -1
backdrop.renderOrder = 0
scene.add(backdrop)

/* ----------------------------------------------------------- GL texts */
const TEXT_FRAG =
  BACKDROP +
  /* glsl */ `
uniform sampler2D uMap; uniform vec3 uColor; uniform float uReveal;
void main(){
  vec3 col = backdrop();
  float local = clamp(uReveal * 1.6 - vUv.x * 0.6, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - local, 4.0);
  vec2 uv = vec2(vUv.x, vUv.y + (1.0 - e));
  float a = uv.y <= 1.0 ? texture2D(uMap, uv).a : 0.0;
  if (a < 0.003) discard;
  gl_FragColor = vec4(mix(col, uColor, a), 1.0);
}`
const C_TEXT = 0xe6e6e6,
  C_STROKE = 0x4a4e57,
  C_DIM = 0x34363b
const texts = [...document.querySelectorAll("[data-gl]")].map((el, k) => {
  const stroke = el.hasAttribute("data-gl-stroke")
  const cnv = document.createElement("canvas")
  const tex = new THREE.CanvasTexture(cnv)
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 4
  const color = lin(stroke ? C_STROKE : C_TEXT)
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...common,
      uMap: { value: tex },
      uColor: { value: color },
      uReveal: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: TEXT_FRAG,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
  mesh.renderOrder = 1
  scene.add(mesh)
  return {
    el,
    k,
    stroke,
    cnv,
    tex,
    mat,
    mesh,
    w: 0,
    h: 0,
    pad: 0,
    target: color.clone(),
    revealAt: -1,
    hero: el.hasAttribute("data-gl-hero"),
  }
})

const mctx = document.createElement("canvas").getContext("2d")
function fitHero() {
  const el = texts.find((t) => t.hero).el
  const cs = getComputedStyle(el)
  const lines = el.innerText.split("\n")
  mctx.font = `800 100px ${cs.fontFamily}`
  mctx.letterSpacing = "-4.5px"
  const wMax = Math.max(...lines.map((l) => mctx.measureText(l).width))
  const avail =
    el.parentElement.clientWidth -
    2 * parseFloat(getComputedStyle(el.parentElement).paddingInlineStart)
  el.style.fontSize = `${Math.floor((100 * avail) / wMax) - 1}px`
}

function drawText(t, r) {
  const cs = getComputedStyle(t.el)
  const fs = parseFloat(cs.fontSize)
  const w = Math.ceil(r.width),
    h = Math.ceil(r.height)
  const pad = Math.ceil(fs * 0.14)
  const scale = Math.min(DPR * 1.15, 4096 / (w + pad * 2))
  t.cnv.width = Math.ceil((w + pad * 2) * scale)
  t.cnv.height = Math.ceil((h + pad * 2) * scale)
  const ctx = t.cnv.getContext("2d")
  ctx.setTransform(scale, 0, 0, scale, pad * scale, pad * scale)
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  ctx.letterSpacing = cs.letterSpacing
  ctx.textBaseline = "alphabetic"
  const asc = ctx.measureText("Hg").fontBoundingBoxAscent
  ctx.lineWidth = Math.max(1.2, fs * 0.0055)
  ctx.strokeStyle = ctx.fillStyle = "#fff"
  const walker = document.createTreeWalker(t.el, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let n; (n = walker.nextNode());) {
    for (const m of n.textContent.matchAll(/\S+/g)) {
      range.setStart(n, m.index)
      range.setEnd(n, m.index + m[0].length)
      const q = range.getClientRects()[0]
      if (!q) continue
      const x = q.left - r.left,
        y = q.top - r.top + asc
      t.stroke ? ctx.strokeText(m[0], x, y) : ctx.fillText(m[0], x, y)
    }
  }
  t.tex.needsUpdate = true
  t.w = w
  t.h = h
  t.pad = pad
  t.mesh.scale.set(w + pad * 2, h + pad * 2, 1)
}

/* --------------------------------------------------------------- glass */
function diamondGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0, 1)
  s.lineTo(1, 0)
  s.lineTo(0, -1)
  s.lineTo(-1, 0)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.46,
    bevelSize: 0.5,
    bevelSegments: 2,
    curveSegments: 1,
  })
  g.center()
  g.computeBoundingBox()
  const k = 1 / g.boundingBox.max.x
  g.scale(k, k, k)
  g.computeVertexNormals()
  return g
}
const geo = diamondGeometry()
const glass = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0,
  roughness: 0.035,
  transmission: 1,
  thickness: 1.25,
  ior: 1.75,
  dispersion: 5,
  envMapIntensity: 1.1,
  specularIntensity: 1,
  emissive: new THREE.Color(0x0e0f12),
  attenuationColor: new THREE.Color(0xc9ced8),
  attenuationDistance: 900,
  flatShading: true,
})
const prism = new THREE.Mesh(geo, glass)
scene.add(prism)
const shards = L.map(() => {
  const m = new THREE.Mesh(geo, glass)
  scene.add(m)
  return m
})

const key = new THREE.DirectionalLight(0xffffff, 1.6)
key.position.set(-0.8, 1.2, 1)
scene.add(key)
const rust = new THREE.PointLight(0xda6a52, 2.2, 0, 0)
scene.add(rust)

/* ------------------------------------------------------------- layout */
const $ = (s) => document.querySelector(s)
const heroEl = $(".hero"),
  prismEl = $(".hero__prism"),
  heroLogo = $(".hero__logo")
const heroFoot = $(".hero__foot"),
  heroMeta = $(".hero__meta")
const anchorsOf = (form) => {
  const a = []
  document
    .querySelectorAll(`[data-form="${form}"]`)
    .forEach((el) => (a[+el.dataset.shard] = el))
  return a
}
const forms = [
  { type: "hero" },
  { type: "anchors", els: anchorsOf("about"), sec: $("#about") },
  { type: "anchors", els: anchorsOf("projects"), sec: $("#projects") },
  { type: "anchors", els: anchorsOf("posts"), sec: $("#posts") },
  { type: "logo", el: $(".contact__logo"), sec: $("#contact") },
]
let focus = []
function measureFocus() {
  const maxScroll = document.documentElement.scrollHeight - vh
  focus = forms.map((f, c) => {
    if (c === 0) return heroEl.offsetHeight - vh + vh * 0.5
    let ys
    if (f.type === "logo") {
      const r = f.el.getBoundingClientRect()
      ys = [r.top + r.height / 2]
    } else
      ys = f.els.map((e) => {
        const r = e.getBoundingClientRect()
        return r.top + r.height / 2
      })
    const y = ys.reduce((a, b) => a + b, 0) / ys.length + scrollY
    return Math.min(y, maxScroll + vh * 0.5)
  })
}

function resize() {
  vw = innerWidth
  vh = innerHeight
  renderer.setSize(vw, vh, false)
  composer.setPixelRatio(DPR)
  composer.setSize(vw, vh)
  camera.aspect = vw / vh
  D = vh / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  camera.position.set(0, 0, D)
  camera.near = D * 0.05
  camera.far = D * 6
  camera.updateProjectionMatrix()
  backdrop.scale.set(vw * 1.6, vh * 1.6, 1)
  common.uView.value.set(vw, vh)
  fitHero()
  for (const t of texts) t.w = -1
  measureFocus()
}

/* ------------------------------------------------------------- helpers */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const mix = (a, b, t) => a + (b - a) * t
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const eLayout = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - 16 * (1 - t) ** 5)
const eOut = (t) => 1 - (1 - t) ** 4
const rnd = (i, k) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}
const toWorld = (sx, sy) => [sx - vw / 2, vh / 2 - sy]

function logoState(r, i) {
  const box = r.width
  return {
    x: r.left + (L[i][0] / 10) * box,
    y: r.top + (L[i][1] / 10) * box,
    s: 0.15 * box * 1.04,
  }
}
function formState(c, i, p) {
  const f = forms[c]
  if (f.type === "hero") return heroState(i, p)
  if (f.type === "logo")
    return { ...logoState(f.el.getBoundingClientRect(), i), rx: 0, ry: 0, z: 0 }
  const r = f.els[i]?.getBoundingClientRect()
  if (!r || !r.width) return null
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    s: r.width / 2,
    rx: 0,
    ry: 0,
    z: 0,
  }
}

// Hero: K0 = the logo laid inside the prism (fused), K1 = exploded across the brand, K2 = compact logo.
function heroState(i, p) {
  const pr = prismEl.getBoundingClientRect()
  const R = pr.width / 2,
    cx = pr.left + R,
    cy = pr.top + R
  const k0 = {
    x: cx + ((L[i][0] - 5) / 10) * 2 * R,
    y: cy + ((L[i][1] - 5) / 10) * 2 * R,
    s: 0.3 * R,
  }
  const sp = vw < 700 ? [0.95, 0.5] : [1.12, 0.42]
  const br = heroText.el.getBoundingClientRect()
  const k1 = {
    x: vw / 2 + ((L[i][0] - 5) / 10) * vw * sp[0],
    y: br.top + br.height / 2 + ((L[i][1] - 5) / 10) * vh * sp[1],
    s: 0.3 * R * (0.85 + rnd(i, 3) * 0.6),
  }
  const k2 = logoState(heroLogo.getBoundingClientRect(), i)
  const a = eLayout(clamp((p - 0.05 - i * 0.012) / 0.38))
  const b = eLayout(clamp((p - 0.52 - i * 0.014) / 0.34))
  const dir = i % 2 ? 1 : -1
  return {
    x: mix(mix(k0.x, k1.x, a), k2.x, b),
    y: mix(mix(k0.y, k1.y, a), k2.y, b),
    s: mix(mix(k0.s, k1.s, a), k2.s, b),
    z:
      Math.sin(Math.PI * a) * 260 * (rnd(i, 1) - 0.3) +
      Math.sin(Math.PI * b) * 140,
    ry: (a + b) * Math.PI * dir,
    rx: Math.sin(Math.PI * a) * 0.7 * dir + Math.sin(Math.PI * b) * 0.5,
  }
}

/* ------------------------------------------------------------- pointer */
const ptr = { x: vw * 0.62, y: vh * 0.45, tx: vw * 0.62, ty: vh * 0.45 }
let lastMove = -1e9
addEventListener("pointermove", (e) => {
  if (!e.movementX && !e.movementY) return
  if (e.pointerType !== "mouse") return
  ptr.tx = e.clientX
  ptr.ty = e.clientY
  lastMove = performance.now()
})

const projectRows = [...document.querySelectorAll(".project")]
const projectTexts = texts.filter((t) => t.el.hasAttribute("data-gl-project"))
projectRows.forEach((row, k) => {
  row.addEventListener("mouseenter", () =>
    projectTexts.forEach((t, j) => t.target.set(j === k ? C_TEXT : C_DIM))
  )
  row.addEventListener("mouseleave", () =>
    projectTexts.forEach((t) => t.target.set(C_TEXT))
  )
})

/* -------------------------------------------------------------- loader */
const state = { fuse: 0, land: L.map(() => 0), flash: 0, sweep: 0, bloom: 0.35 }
const starts = L.map((_, i) => {
  const ang = rnd(i, 7) * Math.PI * 2
  return {
    dx: Math.cos(ang) * (0.7 + rnd(i, 8) * 0.5),
    dy: Math.sin(ang) * (0.7 + rnd(i, 9) * 0.5),
    z: -1200 - rnd(i, 2) * 1600,
    rx: (rnd(i, 4) - 0.5) * 9,
    ry: (rnd(i, 5) - 0.5) * 12,
  }
})
const num = $(".loader__num"),
  bar = $(".loader__bar i"),
  loader = $(".loader")
const heroText = texts.find((t) => t.hero)
const numText = texts.find((t) => t.el === num)
numText.revealAt = 0

function runLoader() {
  const counter = { v: 0 }
  const tl = gsap.timeline()
  tl.to(
    counter,
    {
      v: 100,
      duration: 2.5,
      ease: "power2.inOut",
      onUpdate: () => {
        const v = String(Math.round(counter.v)).padStart(3, "0")
        if (v !== num.textContent) {
          num.textContent = v
          numText.dirty = true
        }
        bar.style.transform = `scaleX(${counter.v / 100})`
      },
    },
    0
  )
  L.forEach((_, i) =>
    tl.to(
      state.land,
      { [i]: 1, duration: 1.7, ease: "expo.out" },
      0.15 + i * 0.11
    )
  )
  tl.to(state, { fuse: 1, duration: 0.55, ease: "power4.inOut" }, 2.35)
  tl.to(state, { flash: 1, duration: 0.18, ease: "power2.out" }, 2.6)
  tl.to(state, { flash: 0, duration: 1.3, ease: "power2.out" }, 2.78)
  tl.fromTo(
    state,
    { sweep: 0 },
    { sweep: 1, duration: 1.1, ease: "power3.inOut" },
    2.45
  )
  tl.to(state, { bloom: 1.1, duration: 0.2, ease: "power2.out" }, 2.6)
  tl.to(state, { bloom: 0.35, duration: 1.2, ease: "power2.out" }, 2.8)
  tl.call(
    () => {
      loader.classList.add("is-out")
      numText.exitAt = performance.now()
      heroText.revealAt = performance.now() + 150
    },
    null,
    2.55
  )
  tl.call(() => document.body.classList.add("is-ready"), null, 2.75)
  tl.call(
    () => {
      document.body.classList.remove("is-loading")
      loader.style.display = "none"
      numText.dead = true
      measureFocus()
    },
    null,
    3.5
  )
}

/* --------------------------------------------------------------- frame */
const cur = shards.map(() => ({
  x: vw / 2,
  y: vh / 2,
  s: 0,
  z: 0,
  rx: 0,
  ry: 0,
  rz: 0,
}))
const prismCur = { rx: 0, ry: 0, x: 0, y: 0 }
let last = performance.now()

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  const t = now / 1000
  const kPos = 1 - Math.exp(-dt * 16),
    kRot = 1 - Math.exp(-dt * 6)
  if (now - lastMove > 2500) {
    // No mouse (touch, or idle): the light drifts around the prism on its own.
    const pr0 = prismEl.getBoundingClientRect(),
      R0 = pr0.width / 2
    ptr.tx = pr0.left + R0 + Math.cos(t * 0.42) * R0 * 1.25
    ptr.ty = pr0.top + R0 + Math.sin(t * 0.67) * R0 * 0.75
  }
  ptr.x += (ptr.tx - ptr.x) * (1 - Math.exp(-dt * 8))
  ptr.y += (ptr.ty - ptr.y) * (1 - Math.exp(-dt * 8))
  common.uPointer.value.set(ptr.x, ptr.y)
  common.uScroll.value = scrollY
  common.uTime.value = t

  // texts
  for (const tx of texts) {
    const r = tx.el.getBoundingClientRect()
    if (tx.dead) {
      tx.mesh.visible = false
      continue
    }
    if (
      tx.dirty ||
      Math.abs(r.width - tx.w) > 1 ||
      Math.abs(r.height - tx.h) > 1
    ) {
      drawText(tx, r)
      tx.dirty = false
    }
    const [wx, wy] = toWorld(r.left + r.width / 2, r.top + r.height / 2)
    tx.mesh.position.set(wx, wy, 0)
    tx.mesh.visible = r.bottom > -tx.pad && r.top < vh + tx.pad
    if (
      tx.revealAt < 0 &&
      !tx.hero &&
      !document.body.classList.contains("is-loading") &&
      r.top < vh * 0.9
    )
      tx.revealAt = now + (tx.stroke ? 0 : 120)
    tx.mat.uniforms.uReveal.value = tx.exitAt
      ? 1 - eOut(clamp((now - tx.exitAt) / 700))
      : tx.revealAt < 0
        ? 0
        : tx.revealAt === 0
          ? 1
          : clamp((now - tx.revealAt) / (tx.hero ? 1500 : 1300))
    tx.mat.uniforms.uColor.value.lerp(tx.target, 1 - Math.exp(-dt * 7))
  }

  // hero pin progress
  const hr = heroEl.getBoundingClientRect()
  const p = clamp(-hr.top / (hr.height - vh))
  const fission = sstep(0.0, 0.07, p)
  const fuse = state.fuse * (1 - fission)
  const fade = 1 - sstep(0.12, 0.34, p)
  if (document.body.classList.contains("is-ready")) {
    heroFoot.style.opacity = fade
    heroMeta.style.opacity = fade
  }
  heroFoot.style.translate = `0 ${(1 - fade) * -30}px`

  // prism
  const pr = prismEl.getBoundingClientRect()
  const R = pr.width / 2
  const ndx = (ptr.x - (pr.left + R)) / vw,
    ndy = (ptr.y - (pr.top + R)) / vh
  prismCur.ry += (ndx * 1.1 + Math.sin(t * 0.45) * 0.16 - prismCur.ry) * kRot
  prismCur.rx +=
    (ndy * 0.9 + Math.sin(t * 0.37 + 1) * 0.12 - prismCur.rx) * kRot
  prismCur.x += (ndx * 70 - prismCur.x) * kRot
  prismCur.y += (ndy * 50 - prismCur.y) * kRot
  {
    const [wx, wy] = toWorld(pr.left + R + prismCur.x, pr.top + R + prismCur.y)
    const sc = R * Math.max(0.0001, eOut(fuse))
    prism.position.set(wx, wy, 0)
    prism.scale.setScalar(sc)
    prism.rotation.set(
      prismCur.rx,
      prismCur.ry + fission * 1.2,
      Math.sin(t * 0.3) * 0.04
    )
    prism.visible = fuse > 0.002
  }

  // chapter travel
  const Yc = scrollY + vh / 2
  let c = 0
  while (c < forms.length - 1 && Yc >= focus[c + 1]) c++
  let tt = 0
  if (c < forms.length - 1 && Yc > focus[c]) {
    const gap = focus[c + 1] - focus[c]
    const ra = c === 0 ? 0 : 0.16,
      rb = 0.2
    tt = clamp((Yc - focus[c] - ra * gap) / ((1 - ra - rb) * gap))
  }
  const loading = state.fuse < 1 && p === 0

  shards.forEach((m, i) => {
    let st
    if (loading) {
      const k0 = heroState(i, 0),
        s0 = starts[i],
        e = state.land[i]
      st = {
        x: mix(k0.x + s0.dx * vw, k0.x, e),
        y: mix(k0.y + s0.dy * vh, k0.y, e),
        s: k0.s * (1 - eOut(state.fuse)),
        z: mix(s0.z, 0, e),
        rx: mix(s0.rx, prismCur.rx, e),
        ry: mix(s0.ry, prismCur.ry, e),
      }
    } else {
      const pc = c === 0 ? p : 1
      const A = formState(c, i, pc)
      const ti = clamp((tt - i * 0.035) / (1 - 6 * 0.035))
      const e = eLayout(ti)
      if (e <= 0 || c === forms.length - 1) st = A
      else {
        const B = formState(c + 1, i, 1)
        if (!A) st = B
        else if (!B) st = A
        else {
          const arc = Math.sin(Math.PI * e)
          st = {
            x: mix(A.x, B.x, e) + arc * vw * 0.09 * (i % 2 ? 1 : -1),
            y: mix(A.y, B.y, e),
            s: mix(A.s, B.s, e) * (1 + arc * 0.5),
            z: mix(A.z, B.z, e) + arc * 220,
            rx: arc * 0.9,
            ry: mix(A.ry, B.ry, e) + e * Math.PI * 2 * (i % 2 ? 1 : -1),
          }
        }
      }
      if (st && c === 0 && tt === 0) st = { ...st, s: st.s * (1 - fuse) }
    }
    if (!st) st = { ...cur[i], s: 0 }
    const q = cur[i]
    const fast = loading ? 1 : kPos
    q.x += (st.x - q.x) * fast
    q.y += (st.y - q.y) * fast
    q.s += (st.s - q.s) * fast
    q.z += ((st.z || 0) - q.z) * fast
    // idle + pointer tilt
    const dx = (ptr.x - q.x) / vw,
      dy = (ptr.y - q.y) / vh
    const near = Math.exp(-(dx * dx + dy * dy) * 18)
    const rx =
      (st.rx || 0) +
      Math.sin(t * 0.6 + i * 1.3) * 0.14 +
      dy * 1.2 * (0.4 + near)
    const ry =
      (st.ry || 0) + Math.sin(t * 0.5 + i * 1.7) * 0.2 + dx * 1.4 * (0.4 + near)
    q.rx += (rx - q.rx) * (loading ? 1 : kRot * 1.6)
    q.ry += (ry - q.ry) * (loading ? 1 : kRot * 1.6)
    const [wx, wy] = toWorld(q.x, q.y)
    m.position.set(wx, wy, q.z)
    m.scale.setScalar(Math.max(0.0001, q.s))
    m.rotation.set(q.rx, q.ry, 0)
    m.visible = q.s > 0.5 && q.y > -q.s * 3 && q.y < vh + q.s * 3
  })

  // lights + flash
  {
    const sweepX = pr.left + R + (state.sweep * 2 - 1) * R * 1.6
    const lx = state.sweep > 0 && state.sweep < 1 ? sweepX : ptr.x
    const ly = state.sweep > 0 && state.sweep < 1 ? pr.top + R * 0.5 : ptr.y
    const [wx, wy] = toWorld(lx, ly)
    rust.position.set(wx, wy, R * 1.8)
    rust.intensity = 2.2 + state.flash * 14
    common.uFlash.value = state.flash + Math.sin(Math.PI * fission) * 0.6
    common.uFlashPos.value.set(pr.left + R, pr.top + R)
    bloom.strength = state.bloom + Math.sin(Math.PI * fission) * 0.6
  }

  composer.render(dt)
  requestAnimationFrame(frame)
}

/* --------------------------------------------------------------- boot */
history.scrollRestoration = "manual"
scrollTo(0, 0)
await Promise.all([
  document.fonts.load("800 100px Tektur"),
  document.fonts.load("700 100px Tektur"),
  document.fonts.load("400 40px Tektur"),
  document.fonts.load("300 100px 'Fira Code'"),
  document.fonts.ready,
])
resize()
addEventListener("resize", resize)
renderer.compile(scene, camera)
requestAnimationFrame((n) => {
  last = n
  frame(n)
  runLoader()
})
