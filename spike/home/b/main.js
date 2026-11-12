// Spike B — «Разгон / Velocity». Throwaway prototype: one file on purpose.
import * as THREE from "three"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js"
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { content, logoDiamonds } from "/shared/content.js"

gsap.registerPlugin(ScrollTrigger)
history.scrollRestoration = "manual"
scrollTo(0, 0)

const $ = (s) => document.querySelector(s)
const isSmall = matchMedia("(max-width: 900px)").matches

// ---------------------------------------------------------------- content
$("#heroName").textContent = content.name
$("#heroHeadline").textContent = content.headline
$("#brand").innerHTML = [...content.brand]
  .map((c) => `<span class="ch"><span>${c}</span></span>`)
  .join("")

const marqueeWords = [
  "Fast interfaces",
  "React",
  "TypeScript",
  "On the edge",
  "Cloudflare Workers",
  "≤ 2.5 s LCP",
]
document.querySelectorAll(".marquee__track").forEach((track, r) => {
  const words = r ? [...marqueeWords].reverse() : marqueeWords
  const chunk = words.map((w) => `<span>${w}<b></b></span>`).join("")
  track.innerHTML = chunk + chunk + chunk
})

const hl = new Set(["blink", "real", "traffic:", "edge"])
$("#aboutText").innerHTML = content.about
  .split(" ")
  .map(
    (w) =>
      `<span class="w${hl.has(w.replace(/[.,]/g, "")) || hl.has(w) ? " hl" : ""}">${w}</span>`
  )
  .join(" ")

$("#stats").innerHTML = content.stats
  .map(([n, l]) => {
    const m = n.match(/^(\D*)([\d.]+)(.*)$/)
    return `<div class="stat"><span class="stat__num" data-pre="${m[1]}" data-to="${m[2]}" data-post="${m[3]}">${m[1]}0${m[3]}</span><span class="stat__label">${l}</span></div>`
  })
  .join("")

$("#rows").innerHTML = content.projects
  .map(
    (p, i) => `
  <li class="row" data-i="${i}">
    <i class="row__bg"></i>
    <a href="#">
      <span class="row__idx">0${i + 1}</span>
      <span class="row__inner"><span class="row__title">${p.title}</span><span class="row__text">${p.text}</span></span>
      <span class="row__tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</span>
      <span class="row__year">${p.year}<i class="row__arrow"></i></span>
    </a>
  </li>`
  )
  .join("")

$("#posts").innerHTML = content.posts
  .map(
    (p, i) => `
  <a class="post" href="#">
    <span class="post__date"><span>${p.date}</span><span>0${i + 1}</span></span>
    <span class="post__num">0${i + 1}</span>
    <span class="post__title">${p.title}</span>
    <span class="post__text">${p.text}</span>
  </a>`
  )
  .join("")

$("#email").innerHTML = `${content.email}<b></b>`

const logoHTML = logoDiamonds
  .map(([x, y]) => `<i style="left:${x * 10}%;top:${y * 10}%"></i>`)
  .join("")
$("#headerLogo").innerHTML = logoHTML
$("#logoFly").innerHTML = logoHTML

const speedoBar = $("#speedoBar")
speedoBar.innerHTML = "<i></i>".repeat(isSmall ? 14 : 20)
const speedoCells = [...speedoBar.children]

// ---------------------------------------------------------------- three
const canvas = $("#scene")
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
})
const dpr = Math.min(devicePixelRatio, 1.5)
renderer.setPixelRatio(dpr)
renderer.setSize(innerWidth, innerHeight)
// The clear lands in the composer target sRGB-encoded (three 0.180), and OutputPass
// encodes again: pass the linear-of-linear value so the page reads #0e0e0f.
renderer.setClearColor(new THREE.Color(0.00034, 0.00034, 0.00037))

const scene = new THREE.Scene()
const FOG = new THREE.Color(0x0e0e0f)
scene.fog = new THREE.FogExp2(FOG, 0.0165)
const camera = new THREE.PerspectiveCamera(
  isSmall ? 82 : 66,
  innerWidth / innerHeight,
  0.1,
  400
)
camera.position.set(0, 0, 6)

const L = 170 // tunnel length
const SPACING = 2.6
const N = Math.floor(L / SPACING)
const RADIUS = isSmall ? 5.2 : 7

const GRAPHITE = new THREE.Color(0x4a4f57)
const GRAPHITE_HI = new THREE.Color(0x9aa2ae)
const RUST = new THREE.Color(0xb84530).multiplyScalar(2.6) // HDR so bloom only catches rust

// Diamond frame: a 4-segment ring is a square on its corner.
const frameGeo = new THREE.RingGeometry(0.985, 1, 4, 1)
const frameMat = new THREE.MeshBasicMaterial({
  side: THREE.DoubleSide,
  fog: true,
})
const frames = new THREE.InstancedMesh(frameGeo, frameMat, N)
frames.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(frames)

// Gates: every 4th frame is thicker, with solid diamond studs on its corners.
const diamondShape = (r) => {
  const sh = new THREE.Shape()
  sh.moveTo(r, 0)
  sh.lineTo(0, r)
  sh.lineTo(-r, 0)
  sh.lineTo(0, -r)
  sh.closePath()
  return sh
}
const gateShape = diamondShape(1)
gateShape.holes.push(diamondShape(0.95))
const gateGeo = new THREE.ExtrudeGeometry(gateShape, {
  depth: 0.6,
  bevelEnabled: false,
})
gateGeo.translate(0, 0, -0.3)
const gateIdx = []
for (let i = 0; i < N; i++) if (i % 4 === 0) gateIdx.push(i)
const gates = new THREE.InstancedMesh(
  gateGeo,
  new THREE.MeshStandardMaterial({
    roughness: 0.38,
    metalness: 0.25,
    fog: true,
  }),
  gateIdx.length
)
const headlight = new THREE.PointLight(0xffffff, 60, 0, 1.15)
scene.add(headlight)
scene.add(new THREE.HemisphereLight(0x8a94a6, 0x0e0e0f, 0.35))
gates.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(gates)
const studGeo = new THREE.CircleGeometry(1, 4)
const studs = new THREE.InstancedMesh(
  studGeo,
  new THREE.MeshBasicMaterial({ fog: true }),
  gateIdx.length * 4
)
studs.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(studs)

// Which gates burn rust: sparse, never two in a row.
const rustGate = gateIdx.map((_, k) => k % 6 === 3)
gateIdx.forEach((_, k) =>
  gates.setColorAt(
    k,
    rustGate[k]
      ? new THREE.Color(0xb84530).multiplyScalar(1.6)
      : new THREE.Color(0x7d848f)
  )
)
for (let k = 0; k < gateIdx.length; k++)
  for (let c = 0; c < 4; c++)
    studs.setColorAt(
      k * 4 + c,
      rustGate[k] || (k % 3 === 0 && c === 0) ? RUST : GRAPHITE_HI
    )
for (let i = 0; i < N; i++) frames.setColorAt(i, GRAPHITE)

// Speed streaks: thin boxes along z, length grows with speed.
const S_COUNT = isSmall ? 260 : 420
const streakGeo = new THREE.BoxGeometry(0.018, 0.018, 1)
const streakMat = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0.55,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: true,
})
const streaks = new THREE.InstancedMesh(streakGeo, streakMat, S_COUNT)
streaks.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(streaks)
const sData = []
for (let i = 0; i < S_COUNT; i++) {
  // Bias streaks toward the walls so the centre (the brand's backdrop) stays calm.
  const rail = Math.random() < 0.18
  const a = rail
    ? (Math.floor(Math.random() * 4) * Math.PI) / 2
    : Math.random() * Math.PI * 2
  const r = rail
    ? RADIUS * 0.985
    : RADIUS * (0.35 + Math.pow(Math.random(), 0.5) * 0.62)
  sData.push({
    a,
    r,
    rail,
    z: Math.random() * L,
    k: rail ? 1.4 + Math.random() * 0.6 : 0.6 + Math.random() * 0.9,
  })
  streaks.setColorAt(i, Math.random() < 0.06 ? RUST : new THREE.Color(0x8d939c))
}

// Beacon: a diamond of light at the end of the tunnel — where the run is heading.
const beaconMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  fog: false,
  uniforms: { uTime: { value: 0 }, uPower: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uPower;
    void main(){
      float d = abs(vUv.x) + abs(vUv.y);            // diamond distance
      float core = smoothstep(0.16, 0.0, d);
      float halo = pow(max(0., 1. - d), 3.0) * 0.55;
      float cross = (smoothstep(0.035, 0.0, abs(vUv.y)) + smoothstep(0.035, 0.0, abs(vUv.x))) * pow(max(0., 1. - max(abs(vUv.x), abs(vUv.y))), 2.) * 0.35;
      vec3 rust = vec3(0.72, 0.27, 0.19);
      vec3 col = vec3(1.0, 0.93, 0.88) * core * 2.2 + rust * halo + vec3(0.8, 0.82, 0.86) * cross;
      gl_FragColor = vec4(col * uPower, 1.);
    }`,
})
const beacon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), beaconMat)
scene.add(beacon)

// Dust
const D_COUNT = 1400
const dustPos = new Float32Array(D_COUNT * 3)
const dustSeed = []
for (let i = 0; i < D_COUNT; i++)
  dustSeed.push({
    a: Math.random() * Math.PI * 2,
    r: Math.random() * RADIUS * 1.1,
    z: Math.random() * L,
  })
const dustGeo = new THREE.BufferGeometry()
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3))
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({
    color: 0x6b7280,
    size: 0.035,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
    fog: true,
  })
)
dust.frustumCulled = false
scene.add(dust)

// ---------------------------------------------------------------- post
const composer = new EffectComposer(renderer)
composer.setPixelRatio(dpr)
composer.setSize(innerWidth, innerHeight)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth / 2, innerHeight / 2),
  0.9,
  0.55,
  0.62
)
composer.addPass(bloom)

const SpeedShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmt: { value: 0 },
    uFlash: { value: 0 },
    uTime: { value: 0 },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uAspect: { value: innerWidth / innerHeight },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uAmt; uniform float uFlash; uniform float uTime; uniform vec2 uCenter; uniform float uAspect;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 dir = vUv - uCenter;
      float dist = length(dir * vec2(uAspect, 1.));
      // radial zoom blur, stronger toward the edges, none at the vanishing point
      float s = uAmt * 0.075 * smoothstep(0.05, 0.9, dist);
      vec3 col = vec3(0.);
      float jitter = hash(vUv * 900. + uTime) ;
      for (int i = 0; i < 10; i++) {
        float t = (float(i) + jitter) / 10.;
        vec2 o = dir * s * t;
        col.r += texture2D(tDiffuse, vUv - o * 1.25).r;
        col.g += texture2D(tDiffuse, vUv - o).g;
        col.b += texture2D(tDiffuse, vUv - o * 0.75).b;
      }
      col /= 10.;
      // vignette
      col *= mix(1., smoothstep(1.25, 0.2, dist), 0.75);
      // grain
      col += (hash(vUv * vec2(1920., 1080.) + fract(uTime * 7.)) - 0.5) * 0.045 * (0.4 + 0.6 * length(col));
      col += uFlash * vec3(1.0, 0.92, 0.88) * (0.35 + 0.65 * smoothstep(0.9, 0.0, dist));
      gl_FragColor = vec4(col, 1.);
    }`,
}
const speedPass = new ShaderPass(SpeedShader)
composer.addPass(new OutputPass())
composer.addPass(speedPass)

// ---------------------------------------------------------------- state
const CRUISE = 16
const state = {
  base: 0,
  boost: 0,
  fovKick: 0,
  flash: 0,
  launched: false,
  bank: 0,
}
const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1
  pointer.y = (e.clientY / innerHeight) * 2 - 1
})

let travel = 0
let lastScroll = scrollY
let scrollVel = 0 // px/s, smoothed
const m4 = new THREE.Matrix4()
const q = new THREE.Quaternion()
const pos = new THREE.Vector3()
const scl = new THREE.Vector3()
const zAxis = new THREE.Vector3(0, 0, 1)
const bend = { x: 0, y: 0 }

// Tunnel centre line at depth d (0 = camera): a parabola that bends with the steering.
const offX = (d) => bend.x * (d / L) * (d / L)
const offY = (d) => bend.y * (d / L) * (d / L)

function placeTunnel(t) {
  const camZ = camera.position.z
  // frames
  let g = 0
  for (let i = 0; i < N; i++) {
    const d = (((i * SPACING - travel) % L) + L) % L
    const z = camZ - 1.5 - d
    const twist =
      (d / L) * state.bank * 2.2 + Math.sin(i * 0.37 + t * 0.2) * 0.012
    q.setFromAxisAngle(zAxis, twist)
    const isGate = i % 4 === 0
    const r = RADIUS * (isGate ? 1.06 : 1)
    pos.set(offX(d), offY(d), z)
    scl.set(r, r, 1)
    m4.compose(pos, q, scl)
    if (isGate) {
      gates.setMatrixAt(g, m4)
      // studs on the four corners
      for (let c = 0; c < 4; c++) {
        const ang = twist + (c * Math.PI) / 2
        const sr = r * 1.0
        const sp = new THREE.Vector3(
          offX(d) + Math.cos(ang) * sr,
          offY(d) + Math.sin(ang) * sr,
          z
        )
        m4.compose(sp, q, scl.set(0.16, 0.16, 1))
        studs.setMatrixAt(g * 4 + c, m4)
      }
      // hide the regular frame under the gate
      m4.compose(pos, q, scl.set(0.0001, 0.0001, 1))
      frames.setMatrixAt(i, m4)
      g++
    } else {
      frames.setMatrixAt(i, m4)
    }
  }
  frames.instanceMatrix.needsUpdate = true
  gates.instanceMatrix.needsUpdate = true
  studs.instanceMatrix.needsUpdate = true
}

function placeStreaks(speed, dt) {
  const camZ = camera.position.z
  const len = 0.25 + speed * 0.075
  for (let i = 0; i < S_COUNT; i++) {
    const s = sData[i]
    s.z = (s.z + speed * s.k * dt * 1.15) % L
    const d = L - s.z
    const a = s.rail ? s.a + (d / L) * state.bank * 2.2 : s.a
    pos.set(
      offX(d) + Math.cos(a) * s.r,
      offY(d) + Math.sin(a) * s.r,
      camZ - 1.5 - d
    )
    q.identity()
    m4.compose(pos, q, scl.set(1, 1, len * s.k))
    streaks.setMatrixAt(i, m4)
  }
  streaks.instanceMatrix.needsUpdate = true
  streakMat.opacity = Math.min(0.85, 0.12 + speed * 0.012)
}

function placeDust(speed, dt) {
  const camZ = camera.position.z
  for (let i = 0; i < D_COUNT; i++) {
    const s = dustSeed[i]
    s.z = (s.z + speed * dt * 0.6) % L
    const d = L - s.z
    dustPos[i * 3] = offX(d) + Math.cos(s.a) * s.r
    dustPos[i * 3 + 1] = offY(d) + Math.sin(s.a) * s.r
    dustPos[i * 3 + 2] = camZ - 1.5 - d
  }
  dustGeo.attributes.position.needsUpdate = true
}

// ---------------------------------------------------------------- DOM loop hooks
const skewEls = [...document.querySelectorAll("[data-skew]")]
const rowInners = [...document.querySelectorAll(".row__inner")]
const tracks = [...document.querySelectorAll(".marquee__track")].map((el) => ({
  el,
  dir: +el.parentElement.dataset.marquee,
  x: 0,
}))
const spdEl = $("#spd")
const loaderSpd = $("#loaderSpd")
const progressEl = $("#progress")
const hero = $("#hero")
const contact = $("#contact")

let prev = performance.now()
let skew = 0
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  const t = now / 1000

  // scroll velocity (native scroll)
  const sy = scrollY
  const raw = (sy - lastScroll) / Math.max(dt, 0.001)
  lastScroll = sy
  scrollVel += (raw - scrollVel) * Math.min(1, dt * 8)
  const absVel = Math.abs(scrollVel)
  state.boost +=
    (Math.min(absVel * 0.045, 110) - state.boost) * Math.min(1, dt * 3)

  const speed = state.base + state.boost
  travel += speed * dt

  // steering with inertia
  pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2.2)
  pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2.2)
  const wander = Math.sin(t * 0.17) * 0.6 + Math.sin(t * 0.071) * 0.4
  bend.x = (pointer.sx * 1.1 + wander * 0.45) * 48
  bend.y = (-pointer.sy * 0.8 + Math.sin(t * 0.13) * 0.25) * 30
  const targetBank = -pointer.sx * 0.22 - wander * 0.06
  state.bank += (targetBank - state.bank) * Math.min(1, dt * 2)

  camera.position.x = pointer.sx * 0.9
  camera.position.y = -pointer.sy * 0.55
  const look = 60
  camera.lookAt(offX(look) * 0.55, offY(look) * 0.55, camera.position.z - look)
  camera.rotateZ(state.bank * 0.9)
  const baseFov = isSmall ? 82 : 66
  camera.fov = baseFov + Math.min(speed, 160) * 0.09 + state.fovKick
  camera.updateProjectionMatrix()

  // render only when the tunnel is on screen (hero or contact)
  const heroVis = hero.getBoundingClientRect().bottom > 0
  const contactVis = contact.getBoundingClientRect().top < innerHeight
  if (heroVis || contactVis || !state.launched) {
    placeTunnel(t)
    placeStreaks(speed, dt)
    placeDust(speed, dt)
    const bd = L * 0.62
    beacon.position.set(offX(bd), offY(bd), camera.position.z - 1.5 - bd)
    beacon.scale.setScalar(26 + Math.min(speed, 160) * 0.05)
    beacon.quaternion.copy(camera.quaternion)
    beaconMat.uniforms.uPower.value = 0.75 + Math.min(speed / 160, 1) * 0.6
    headlight.position.copy(camera.position)
    // project the vanishing point for the blur centre
    pos
      .set(offX(L * 0.6), offY(L * 0.6), camera.position.z - L * 0.6)
      .project(camera)
    speedPass.uniforms.uCenter.value.set(pos.x * 0.5 + 0.5, pos.y * 0.5 + 0.5)
    speedPass.uniforms.uAmt.value = Math.min(1.6, speed / 70)
    speedPass.uniforms.uFlash.value = state.flash
    speedPass.uniforms.uTime.value = t
    bloom.strength = 0.75 + Math.min(speed / 120, 1) * 0.6
    composer.render(dt)
  }

  // HUD
  const kmh = String(Math.round(speed * 6.5)).padStart(3, "0")
  spdEl.textContent = kmh
  loaderSpd.textContent = kmh
  const lit = Math.round(Math.min(1, speed / 140) * speedoCells.length)
  speedoCells.forEach((c, i) => {
    c.className = i < lit ? (i >= speedoCells.length * 0.75 ? "hot" : "on") : ""
  })

  // velocity-driven typography
  const targetSkew = gsap.utils.clamp(-14, 14, scrollVel * -0.006)
  skew += (targetSkew - skew) * Math.min(1, dt * 10)
  const stretch = 1 + Math.min(Math.abs(skew) / 14, 1) * 0.06
  for (const el of skewEls)
    el.style.transform = `skewY(${skew * 0.5}deg) scaleY(${stretch})`
  for (const el of rowInners)
    el.style.transform = `skewX(${skew * -1.2}deg) translateX(${skew * 3}px)`
  for (const tr of tracks) {
    tr.x -= tr.dir * (60 + absVel * 0.5) * dt
    const w = tr.el.scrollWidth / 3
    if (tr.x < -w) tr.x += w
    if (tr.x > 0) tr.x -= w
    tr.el.style.transform = `translate3d(${tr.x}px,0,0) skewX(${skew * -0.8}deg)`
  }
  const max = document.documentElement.scrollHeight - innerHeight
  progressEl.style.transform = `scaleX(${max > 0 ? sy / max : 0})`

  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  speedPass.uniforms.uAspect.value = camera.aspect
  camera.updateProjectionMatrix()
})

// ---------------------------------------------------------------- loader → launch
const counter = { p: 0 }
const countEl = $("#count")
const barEl = $("#bar")
const statusEl = $("#loaderStatus")
const flyDiamonds = [...document.querySelectorAll("#logoFly i")]
gsap.set(flyDiamonds, { scale: 0, opacity: 0 })
gsap.set([".header__nav", ".header__cv"], { opacity: 0, y: -10 })
const statuses = ["SYSTEMS CHECK", "SPOOLING", "TRACTION", "LAUNCH"]

const intro = gsap.timeline({ delay: 0.25 })
intro.to(counter, {
  p: 1,
  duration: 3,
  ease: "power2.in",
  onUpdate() {
    const p = counter.p
    countEl.textContent = String(Math.round(p * 100)).padStart(3, "0")
    barEl.style.transform = `scaleX(${p})`
    statusEl.textContent = statuses[Math.min(3, Math.floor(p * 4))]
    state.base = 1.5 + Math.pow(p, 2.2) * 120
  },
})
// The seven logo diamonds emerge from the vanishing point, one by one.
flyDiamonds.forEach((d, i) => {
  intro.fromTo(
    d,
    { scale: 0, opacity: 0, x: 0, y: 0 },
    { scale: 1, opacity: 1, duration: 0.7, ease: "expo.out" },
    0.9 + i * 0.22
  )
})

intro.add(launch)

function launch() {
  state.launched = true
  const tl = gsap.timeline()
  // the kick: flash, FOV punch, overshoot, settle to cruise
  tl.to(state, { flash: 0.42, duration: 0.06, ease: "none" }, 0)
  tl.to(state, { flash: 0, duration: 0.7, ease: "expo.out" }, 0.06)
  tl.to(state, { fovKick: 26, duration: 0.14, ease: "power3.out" }, 0)
  tl.to(state, { fovKick: 0, duration: 1.6, ease: "expo.out" }, 0.14)
  tl.to(state, { base: 190, duration: 0.15, ease: "power2.out" }, 0)
  tl.to(state, { base: CRUISE, duration: 2.4, ease: "expo.out" }, 0.15)
  tl.to("#loader", { opacity: 0, duration: 0.5, ease: "expo.out" }, 0)

  // logo flies into the header (FLIP)
  const from = $("#logoFly").getBoundingClientRect()
  const to = $("#headerLogo").getBoundingClientRect()
  tl.to(
    "#logoFly",
    {
      x: to.left + to.width / 2 - (from.left + from.width / 2),
      y: to.top + to.height / 2 - (from.top + from.height / 2),
      scale: to.width / from.width,
      duration: 1.1,
      ease: "expo.inOut",
    },
    0.1
  )
  tl.set("#headerLogo", { opacity: 1 }, 1.2)
  tl.set("#logoFly", { display: "none" }, 1.2)
  tl.to(".header__name", { opacity: 1, duration: 0.6, ease: "expo.out" }, 1.0)
  tl.to(
    [".header__nav", ".header__cv"],
    { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.08 },
    0.7
  )

  // brand slams in from below, letter by letter
  tl.to(
    "#brand .ch > span",
    { y: "0%", duration: 1.3, ease: "expo.out", stagger: 0.045 },
    0.2
  )
  tl.to(
    ".reveal",
    { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.07 },
    0.55
  )
  tl.add(() => {
    document.body.classList.remove("is-loading")
    ScrollTrigger.refresh()
  }, 0.6)
}

// ---------------------------------------------------------------- scroll choreography
// Hero brand drifts down a little slower than the page and dims as you leave.
gsap.to(".hero__brand", {
  yPercent: 18,
  opacity: 0.25,
  ease: "none",
  scrollTrigger: {
    trigger: hero,
    start: "top top",
    end: "bottom top",
    scrub: true,
  },
})
gsap.to([".hero__row--top", ".hero__row--mid"], {
  y: -60,
  opacity: 0,
  ease: "none",
  scrollTrigger: {
    trigger: hero,
    start: "top top",
    end: "60% top",
    scrub: true,
  },
})

gsap.utils.toArray(".section-head__line").forEach((el) => {
  gsap.fromTo(
    el,
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: "top 90%",
        end: "top 55%",
        scrub: true,
      },
    }
  )
})

gsap.to("#aboutText .w", {
  opacity: 1,
  stagger: 0.05,
  ease: "none",
  scrollTrigger: {
    trigger: "#aboutText",
    start: "top 80%",
    end: "bottom 45%",
    scrub: true,
  },
})

document.querySelectorAll(".stat__num").forEach((el) => {
  const to = parseFloat(el.dataset.to)
  const dec = el.dataset.to.includes(".") ? 1 : 0
  const o = { v: 0 }
  ScrollTrigger.create({
    trigger: el,
    start: "top 85%",
    once: true,
    onEnter: () =>
      gsap.to(o, {
        v: to,
        duration: 2,
        ease: "expo.out",
        onUpdate: () => {
          el.textContent = el.dataset.pre + o.v.toFixed(dec) + el.dataset.post
        },
      }),
  })
})

gsap.from(".work__title h2", {
  yPercent: 40,
  opacity: 0,
  duration: 1.4,
  ease: "expo.out",
  scrollTrigger: { trigger: ".work__title", start: "top 85%" },
})
gsap.utils.toArray(".row").forEach((row) => {
  gsap.from(row.querySelector("a"), {
    yPercent: 60,
    opacity: 0,
    duration: 1.2,
    ease: "expo.out",
    scrollTrigger: { trigger: row, start: "top 92%" },
  })
})
gsap.utils.toArray(".post").forEach((post, i) => {
  gsap.fromTo(
    post,
    { "--line": 0 },
    {
      "--line": 1,
      ease: "none",
      scrollTrigger: {
        trigger: post,
        start: "top 90%",
        end: "top 50%",
        scrub: true,
      },
    }
  )
  gsap.from(post.children, {
    y: 40,
    opacity: 0,
    stagger: 0.06,
    duration: 1.1,
    delay: i * 0.08,
    ease: "expo.out",
    scrollTrigger: { trigger: post, start: "top 85%" },
  })
})

// Finale: approaching the contact, the run accelerates again.
ScrollTrigger.create({
  trigger: contact,
  start: "top bottom",
  end: "bottom bottom",
  onUpdate: (st) => {
    if (state.launched) state.base = CRUISE + st.progress * 34
  },
})
gsap.from(".contact__title", {
  yPercent: 30,
  opacity: 0,
  duration: 1.4,
  ease: "expo.out",
  scrollTrigger: { trigger: ".contact__title", start: "top 90%" },
})

// ---------------------------------------------------------------- project preview
const preview = $("#preview")
const previewIdx = $("#previewIdx")
const previewTags = $("#previewTags")
const pv = {
  x: innerWidth / 2,
  y: innerHeight / 2,
  tx: innerWidth / 2,
  ty: innerHeight / 2,
  s: 0,
  ts: 0,
  r: 0,
}
addEventListener("pointermove", (e) => {
  pv.tx = e.clientX
  pv.ty = e.clientY
})
document.querySelectorAll(".row").forEach((row) => {
  row.addEventListener("pointerenter", () => {
    const p = content.projects[+row.dataset.i]
    previewIdx.textContent = `0${+row.dataset.i + 1}`
    previewTags.textContent = p.tags.join(" · ")
    pv.ts = 1
  })
  row.addEventListener("pointerleave", () => {
    pv.ts = 0
  })
})
gsap.ticker.add((_, dtMs) => {
  // rows move under a still pointer while scrolling: re-check what is under it
  if (Math.abs(scrollVel) > 30) {
    const row = document.elementFromPoint(pv.tx, pv.ty)?.closest(".row")
    pv.ts = row ? 1 : 0
    if (row) {
      previewIdx.textContent = `0${+row.dataset.i + 1}`
      previewTags.textContent =
        content.projects[+row.dataset.i].tags.join(" · ")
    }
  }
  const k = Math.min(1, (dtMs / 1000) * 9)
  const dx = pv.tx - pv.x
  pv.x += dx * k
  pv.y += (pv.ty - pv.y) * k
  pv.s += (pv.ts - pv.s) * Math.min(1, (dtMs / 1000) * 7)
  pv.r += (gsap.utils.clamp(-25, 25, dx * 0.15) - pv.r) * k
  preview.style.transform = `translate3d(${pv.x}px, ${pv.y}px, 0) rotate(${pv.r}deg) scale(${pv.s})`
})
