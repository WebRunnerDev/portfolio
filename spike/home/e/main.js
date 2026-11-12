// Spike E · Index — WebRunner, the crawler that reads the whole web.
// The hero is a cast-graphite slab engraved with a matrix of the web (URLs,
// requests, headers). Molten metal is poured into the "WebRunner" letter
// moulds; once it cools, hot crawlers read the engraving line by line and the
// grooves glow where they pass. A's seven cast blocks sit beside the brand and
// carry the page: header logo → chapter markers → the footer, where a second
// slab is poured as it enters.
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
// Split the statement into word masks; each word knows its order for the heat stagger.
for (const el of $$(".split")) {
  let i = 0
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
            w.style.setProperty("--i", i++)
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

/* ---------------- The web, as engraving ---------------- */
function rng(seed) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
}
const PATHS = [
  "/en",
  "/en/cv",
  "/en/projects",
  "/en/projects/edge-portfolio",
  "/en/projects/realtime-board",
  "/en/projects/shop-checkout",
  "/en/projects/design-system",
  "/en/blog",
  "/en/blog/edge-caching",
  "/en/blog/meta-injection",
  "/en/blog/rtl-from-day-one",
  "/en/gallery",
  "/en/gallery/astana",
  "/ru",
  "/kk/projects",
  "/de/blog",
  "/ar",
  "/en/rss.xml",
  "/sitemap.xml",
  "/robots.txt",
  "/cv.pdf",
  "/en/blog?tag=edge",
]
const TITLES = [
  "Edge portfolio",
  "Realtime board",
  "Shop checkout",
  "Design system",
  "Edge caching",
  "Meta injection",
  "RTL from day one",
  "Astana",
]
function webLine(r, n) {
  const pick = (a) => a[Math.floor(r() * a.length)]
  const p = pick(PATHS),
    p2 = pick(PATHS),
    hex = () =>
      Math.floor(r() * 0xffffffff)
        .toString(16)
        .padStart(8, "0")
  const segs = [
    () =>
      `GET https://webrunner.dev${p}  200  ${3 + Math.floor(r() * 40)}ms  ${(r() * 48 + 1).toFixed(1)}kB`,
    () => `<a href="${p}">${pick(TITLES)}</a>`,
    () => `301 ${p} → ${p2}`,
    () => `cache-control: public, max-age=${pick([60, 300, 3600, 86400])}`,
    () => `cf-cache-status: ${pick(["HIT", "HIT", "MISS", "REVALIDATED"])}`,
    () => `link: <${p}>; rel=preload`,
    () =>
      `depth ${String(1 + Math.floor(r() * 6)).padStart(2, "0")} · queued ${Math.floor(r() * 4000)} · visited ${Math.floor(r() * 9000)}`,
    () => `HEAD ${p}  304`,
    () => `content-type: text/html; charset=utf-8`,
    () => `etag: "${hex()}"`,
    () =>
      `<link rel="alternate" hreflang="${pick(["en", "ru", "kk", "de", "ar"])}" href="${p}">`,
    () => `robots: index, follow`,
  ]
  const parts = [],
    first = p
  for (let i = 0; i < 14; i++) parts.push(pick(segs)())
  return {
    text: `${String(n).padStart(4, "0")}  ${parts.join("   ")}`,
    url: first,
  }
}

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

/* ---------------- Slabs: cast graphite with the web engraved into it ---------------- */
const SLAB_Z = -0.55 // front face; blocks sit slightly sunk into it
const SLAB_DEPTH = 0.9
const dummyNormal = new THREE.DataTexture(
  new Uint8Array([128, 128, 255, 255]),
  1,
  1
)
dummyNormal.needsUpdate = true
const sideMat = new THREE.MeshPhysicalMaterial({
  color: 0x2a2b2f,
  metalness: 0.9,
  roughness: 0.55,
})

function makeSlabMaterial(u) {
  // normalMap only switches on the tangent frame (tbn); the normal itself is derived from uData below.
  const m = new THREE.MeshPhysicalMaterial({
    color: 0x222327,
    metalness: 0.85,
    roughness: 0.68,
    envMapIntensity: 0.24,
    normalMap: dummyNormal,
  })
  if (location.search.includes("dbg")) m.defines = { SLAB_DEBUG: 1 }
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, u)
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWorldP;\nvarying vec2 vSlabUv;"
      )
      .replace(
        "#include <fog_vertex>",
        "#include <fog_vertex>\nvSlabUv = uv;\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;"
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vWorldP; varying vec2 vSlabUv;
uniform sampler2D uData; uniform vec2 uTexel, uSlabPx;
uniform float uTime, uMolten, uHeatAmt, uHeatR; uniform vec3 uHeatPoint;
uniform float uFill, uSlabMolten, uSeam, uLetterWarm, uDepthK;
uniform float uRow0, uRowH, uRows, uStep, uLineDur, uCrawlT, uCrawlOn, uReveal, uLit;
uniform vec4 uBrandBox; uniform vec4 uHotR, uHotR2; uniform float uHotA, uHotA2;
${NOISE}
float sLetter = 0.0;
float slabDepth(vec2 uv){ vec4 d = texture2D(uData, uv); return d.r*0.7 + d.b*0.55; }`
      )
      .replace(
        "#include <normal_fragment_maps>",
        `
{
  vec2 tx = uTexel;
  float dl = slabDepth(vSlabUv - vec2(tx.x, 0.0)), dr = slabDepth(vSlabUv + vec2(tx.x, 0.0));
  float dd = slabDepth(vSlabUv - vec2(0.0, tx.y)), du = slabDepth(vSlabUv + vec2(0.0, tx.y));
  vec3 mapN = normalize(vec3((dr - dl) * uDepthK, (du - dd) * uDepthK, 1.0));
  normal = normalize(tbn * mapN);
}`
      )
      .replace(
        "#include <lights_physical_fragment>",
        `#include <lights_physical_fragment>
  // Cast letters: dark iron with a soft sheen, not a mirror of the room.
  material.specularF90 = mix(material.specularF90, 0.18, sLetter);
  material.specularColor = mix(material.specularColor, vec3(0.03), sLetter);`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
{
  vec4 D = texture2D(uData, vSlabUv);
  float groove = D.r, fillM = D.g, edge = D.b;
  vec2 px = vec2(vSlabUv.x, 1.0 - vSlabUv.y) * uSlabPx;
  // Crawlers: each line is read left to right in uLineDur; lines are visited in a
  // scattered order (rank = line * step mod rows); four crawlers a quarter apart.
  float l = floor((px.y - uRow0) / uRowH);
  float lineOk = step(0.0, l) * step(l, uRows - 1.0);
  float rank = mod(l * uStep, uRows);
  float P = uRows * uLineDur;
  float crawl = 0.0, headH = 0.0;
  for (int k = 0; k < 4; k++) {
    float tp = rank * uLineDur + vSlabUv.x * uLineDur + float(k) * P * 0.25;
    float age = mod(uCrawlT - tp, P);
    crawl += exp(-age * 2.8) + 0.05 * exp(-age * 0.2);
    headH += exp(-age * 18.0);
  }
  float lf = (l + 0.5) / uRows;
  float rev = exp(-pow((lf - uReveal) * 7.0, 2.0)) * step(0.0005, uReveal) * (1.0 - smoothstep(1.0, 1.2, uReveal));
  crawl = (crawl * uCrawlOn + rev * 1.1) * lineOk;
  headH *= uCrawlOn * lineOk;
  float d = distance(vWorldP.xy, uHeatPoint.xy);
  float fall = exp(-d*d/(uHeatR*uHeatR)) * uHeatAmt;
  float tg = groove * (crawl * 0.72 + headH * 0.75 + fall * 1.0);

  // Letters: moulds poured left to right, each rising from the bottom.
  float bx = clamp((px.x - uBrandBox.x) / max(uBrandBox.z - uBrandBox.x, 1.0), 0.0, 1.0);
  float yN = 1.0 - clamp((px.y - uBrandBox.y) / max(uBrandBox.w - uBrandBox.y, 1.0), 0.0, 1.0);
  float lvl = uFill * 1.6 - bx * 0.6;
  float wob = sin(px.x*0.045 + uTime*5.0)*0.012 + sin(px.x*0.11 - uTime*3.1)*0.006;
  float filled = 1.0 - smoothstep(lvl - 0.012, lvl + 0.012, yN + wob);
  float n = fbm(px*0.012 + vec2(0.0, -uTime*0.6));
  float vn = fbm(px*0.0062 + 3.0 + vec2(uTime*0.01, 0.0));
  float vein = 1.0 - smoothstep(0.0, 0.04, abs(vn - 0.5));
  float vn2 = fbm(px*0.017 + 11.0);
  vein = max(vein, 0.6*(1.0 - smoothstep(0.0, 0.03, abs(vn2 - 0.5))));
  float molten = filled * (0.5 + 0.22*n + 0.3*vein);
  molten += filled * smoothstep(0.05, 0.0, abs(lvl - yN - wob)) * step(lvl, 0.995) * 0.45;
  float crust = fbm(px*0.01 + 7.0);
  molten *= clamp(uSlabMolten*2.0 - crust + vein*uSlabMolten*0.8, 0.0, 1.0);
  float hotRect = step(uHotR.x, px.x) * step(px.x, uHotR.z) * step(uHotR.y, px.y) * step(px.y, uHotR.w) * uHotA;
  hotRect = max(hotRect, step(uHotR2.x, px.x) * step(px.x, uHotR2.z) * step(uHotR2.y, px.y) * step(px.y, uHotR2.w) * uHotA2);
  float tb = fillM * max(max(molten, hotRect * (0.72 + 0.25*n + 0.4*vein)), fall*(0.4 + 0.6*vein) + uLetterWarm*(0.04 + 0.8*vein));
  float te = edge * uSeam * smoothstep(0.35, 0.75, n + 0.25*vein) * step(0.001, uLit);
  float t = max(max(tg, tb), max(te, fall * 0.16 * (1.0 - fillM)));
  float hot = smoothstep(0.25, 0.85, t);
  sLetter = fillM * (1.0 - hot);
  float pit = 1.0 - 0.88*groove;
  float cloud = 0.7 + 0.6*fbm(px*0.0035 + 2.0);
  diffuseColor.rgb *= pit * cloud * (0.82 + 0.36*fbm(px*0.035)) * (1.0 - 0.85*hot);
  // Letter moulds: an empty black cavity until poured, then polished dark graphite.
  float everFilled = clamp(filled + step(1.0, uFill), 0.0, 1.0);
  vec3 letter = mix(vec3(0.012), vec3(0.05, 0.052, 0.058), everFilled);
  diffuseColor.rgb = mix(diffuseColor.rgb, letter * (1.0 - 0.85*hot), fillM);
  roughnessFactor = mix(roughnessFactor * (0.75 + 0.5*fbm(px*0.05)), mix(0.9, 0.34 + 0.14*fbm(px*0.02), everFilled), fillM);
  roughnessFactor = clamp(roughnessFactor + hot*0.25, 0.05, 1.0);
  metalnessFactor = mix(mix(metalnessFactor, 0.72, fillM), 0.2, hot);
  totalEmissiveRadiance += heatRamp(t) * pow(t, 1.6) * 4.2;
  #ifdef SLAB_DEBUG
  diffuseColor.rgb = vec3(0.0); totalEmissiveRadiance = vec3(groove, fillM, edge);
  #endif
}`
      )
  }
  return m
}

// Draws one text element into the slab canvas, glyph by glyph at its DOM position.
function glyphRuns(el, slabRect) {
  const runs = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const pcs = getComputedStyle(node.parentElement)
    for (let i = 0; i < node.length; i++) {
      const ch = node.data[i]
      if (/\s/.test(ch)) continue
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const r = range.getBoundingClientRect()
      runs.push({
        ch,
        x: r.left - slabRect.left,
        top: r.top - slabRect.top,
        h: r.height,
        size: parseFloat(pcs.fontSize),
        weight: pcs.fontWeight,
        family: pcs.fontFamily,
      })
    }
  }
  return runs
}

class Slab {
  constructor(root, opts) {
    this.root = root
    this.opts = opts
    this.u = {
      uData: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uSlabPx: { value: new THREE.Vector2() },
      uFill: { value: 0 },
      uSlabMolten: { value: 1 },
      uSeam: { value: 0 },
      uLetterWarm: { value: 0 },
      uDepthK: { value: 0.85 },
      uRow0: { value: 0 },
      uRowH: { value: 1 },
      uRows: { value: 1 },
      uStep: { value: 1 },
      uLineDur: { value: 1.1 },
      uCrawlT: { value: 0 },
      uCrawlOn: { value: 0 },
      uReveal: { value: 0 },
      uLit: { value: 0 },
      uBrandBox: { value: new THREE.Vector4() },
      uHotR: { value: new THREE.Vector4(0, 0, -1, -1) },
      uHotA: { value: 0 },
      uHotR2: { value: new THREE.Vector4(0, 0, -1, -1) },
      uHotA2: { value: 0 },
    }
    this.mat = makeSlabMaterial(this.u)
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [
      sideMat,
      sideMat,
      sideMat,
      sideMat,
      this.mat,
      sideMat,
    ])
    this.mesh.visible = false
    this.tilt = { x: 0, y: 0 }
    scene.add(this.mesh)
    this.lines = []
  }
  build() {
    const root = this.root.getBoundingClientRect()
    const mx = Math.round(innerWidth * 0.05),
      mTop = this.opts.bleedTop ?? 60
    const slab = {
      left: root.left - mx,
      top: root.top - mTop,
      w: root.width + 2 * mx,
      h: root.height + mTop,
    }
    this.margin = { x: mx, top: mTop }
    this.size = slab
    const tpx = clamp(devicePixelRatio, 1.25, 2)
    const cw = Math.round(slab.w * tpx),
      ch = Math.round(slab.h * tpx)
    const c = document.createElement("canvas")
    c.width = cw
    c.height = ch
    const g = c.getContext("2d")
    g.scale(tpx, tpx)
    g.fillStyle = "#000"
    g.fillRect(0, 0, slab.w, slab.h)
    // 1. The matrix: dense rows of the web, engraved (red channel).
    const fs = clamp(innerWidth * 0.0078, 9.5, 12.5)
    const rowH = Math.round(fs * 1.7 * 10) / 10
    const row0 = mTop + (this.opts.rowStart ?? 6)
    const rows = Math.floor((slab.h - row0 - 4) / rowH)
    g.font = `500 ${fs}px "Fira Code"`
    g.textBaseline = "alphabetic"
    g.fillStyle = "#ff0000"
    const r = rng(this.opts.seed)
    this.lines = []
    for (let i = 0; i < rows; i++) {
      let line = webLine(r, i + (this.opts.seed % 977))
      let text = line.text
      while (g.measureText(text).width < slab.w)
        text += "   " + webLine(r, 0).text.slice(6)
      g.globalAlpha = r() < 0.3 ? 0.4 : 0.85 + 0.15 * r()
      g.fillText(text, 8 - r() * 240, row0 + i * rowH + rowH * 0.72)
      this.lines.push(line)
    }
    g.globalAlpha = 1
    // 2. Clearances: around cast letters and behind DOM copy, so both read.
    const cast = this.opts.cast.flatMap((el) => glyphRuns(el, slab))
    g.globalCompositeOperation = "destination-out"
    for (const rect of this.opts.clear.map((el) =>
      el.getBoundingClientRect()
    )) {
      if (!rect.width) continue
      g.fillRect(
        rect.left - slab.left - 14,
        rect.top - slab.top - 10,
        rect.width + 28,
        rect.height + 20
      )
    }
    for (const el of this.opts.cast) {
      const rect = el.getBoundingClientRect()
      const pad = parseFloat(getComputedStyle(el).fontSize) * 0.08
      g.fillRect(
        rect.left - slab.left - pad * 2,
        rect.top - slab.top - pad,
        rect.width + pad * 4,
        rect.height + pad * 2
      )
    }
    for (const gl of cast) {
      g.font = `${gl.weight} ${gl.size}px ${gl.family}`
      g.lineJoin = "round"
      g.lineWidth = gl.size * 0.11
      const base = gl.top + g.measureText("H").fontBoundingBoxAscent
      g.strokeStyle = "#000"
      g.fillStyle = "#000"
      g.strokeText(gl.ch, gl.x, base)
      g.fillText(gl.ch, gl.x, base)
    }
    // 3. Letter moulds (green) and the shrink seam around them (blue).
    g.globalCompositeOperation = "lighter"
    let bx0 = Infinity,
      by0 = Infinity,
      bx1 = -Infinity,
      by1 = -Infinity
    for (const gl of cast) {
      g.font = `${gl.weight} ${gl.size}px ${gl.family}`
      const m = g.measureText(gl.ch)
      const base = gl.top + m.fontBoundingBoxAscent
      g.fillStyle = "#00ff00"
      g.fillText(gl.ch, gl.x, base)
      bx0 = Math.min(bx0, gl.x)
      bx1 = Math.max(bx1, gl.x + m.width)
      by0 = Math.min(by0, base - m.actualBoundingBoxAscent)
      by1 = Math.max(by1, base + m.actualBoundingBoxDescent)
    }
    g.filter = `blur(${(1.2 * tpx).toFixed(1)}px)`
    for (const gl of cast) {
      g.font = `${gl.weight} ${gl.size}px ${gl.family}`
      const base = gl.top + g.measureText("H").fontBoundingBoxAscent
      g.lineWidth = Math.max(2, gl.size * 0.022)
      g.strokeStyle = "#0000ff"
      g.strokeText(gl.ch, gl.x, base)
    }
    g.filter = "none"
    g.globalCompositeOperation = "source-over"
    // Hot rect: the element marked data-hot is permanently molten.
    const hot = this.opts.hot?.getBoundingClientRect()
    if (hot)
      this.u.uHotR2.value.set(
        hot.left - slab.left - 10,
        hot.top - slab.top - 10,
        hot.right - slab.left + 10,
        hot.bottom - slab.top + 10
      )

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.NoColorSpace
    tex.generateMipmaps = false
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    this.u.uData.value?.dispose()
    this.u.uData.value = tex
    this.u.uTexel.value.set(1 / cw, 1 / ch)
    this.u.uSlabPx.value.set(slab.w, slab.h)
    this.u.uRow0.value = row0
    this.u.uRowH.value = rowH
    this.u.uRows.value = rows
    // A step coprime with the row count scatters the reading order over the slab.
    const gcd = (a, b) => (b ? gcd(b, a % b) : a)
    let step = Math.max(2, Math.round(rows * 0.38))
    while (gcd(step, rows) !== 1) step++
    this.u.uStep.value = step
    this.lineOfRank = new Array(rows)
    for (let l = 0; l < rows; l++) this.lineOfRank[(l * step) % rows] = l
    this.u.uBrandBox.value.set(bx0, by0, bx1, by1)
    this.ready = true
  }
  update(dt) {
    if (!this.ready) return
    const r = this.root.getBoundingClientRect()
    const top = r.top - this.margin.top,
      left = r.left - this.margin.x
    const vis = top < innerHeight + 40 && top + this.size.h > -40
    this.mesh.visible = vis
    if (!vis) return
    const k = (CAM_D - SLAB_Z) / CAM_D
    const H = viewH(),
      W = H * (innerWidth / innerHeight)
    const cx = ((left + this.size.w / 2) / innerWidth - 0.5) * W * k
    const cy = -((top + this.size.h / 2) / innerHeight - 0.5) * H * k
    const w = (this.size.w / innerHeight) * H * k,
      h = (this.size.h / innerHeight) * H * k
    // A heavy plate: it leans a little toward the pointer, around its own centre.
    const px = pointer.x / innerWidth - 0.5,
      py = pointer.y / innerHeight - 0.5
    this.tilt.x = lerp(
      this.tilt.x,
      py * 0.05 * this.opts.tilt,
      1 - Math.exp(-dt * 2.5)
    )
    this.tilt.y = lerp(
      this.tilt.y,
      px * 0.07 * this.opts.tilt,
      1 - Math.exp(-dt * 2.5)
    )
    this.mesh.position.set(cx, cy, SLAB_Z - SLAB_DEPTH / 2)
    this.mesh.scale.set(w, h, SLAB_DEPTH)
    this.mesh.rotation.set(this.tilt.x, this.tilt.y, 0)
  }
}

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
const R_L1 = 1 + 0.12 * Math.SQRT2
const seamShape = new THREE.Shape()
const SR = 1.42
seamShape.moveTo(0, SR)
seamShape.lineTo(SR, 0)
seamShape.lineTo(0, -SR)
seamShape.lineTo(-SR, 0)
seamShape.closePath()
const seamGeo = new THREE.ShapeGeometry(seamShape)

const CHAPTER_OF = [0, 1, 2, -1, -1, -1, -1]
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
let workHover = 0
$("[data-projects]").addEventListener("pointerover", () => {
  workHover = 1
})
$("[data-projects]").addEventListener("pointerleave", () => {
  workHover = 0
})
let emailHover = 0
email.addEventListener("pointerenter", () => {
  emailHover = 1
})
email.addEventListener("pointerleave", () => {
  emailHover = 0
})
email.addEventListener("focus", () => {
  emailHover = 1
})
email.addEventListener("blur", () => {
  emailHover = 0
})

/* ---------------- Slabs ---------------- */
const heroSlab = new Slab($(".hero"), {
  seed: 7,
  tilt: 1,
  bleedTop: 80,
  rowStart: 4,
  cast: $$(".hero__brand .reveal > span"),
  clear: [
    ...$$(".hero__meta > *"),
    $(".hero__intro"),
    $(".hero__actions"),
    $(".hero__scroll"),
  ],
})
const footSlab = new Slab($(".contact"), {
  seed: 31,
  tilt: 0.6,
  bleedTop: 0,
  rowStart: 2,
  cast: [...$$(".contact__title .reveal > span"), email],
  clear: [$(".contact__label"), $(".contact__bar")],
  hot: $(".contact__title [data-hot]"),
  hover: email,
})
const slabs = [heroSlab, footSlab]
function buildSlabs() {
  // Measure without the reveal transforms, so the casts land where the copy will.
  document.body.classList.add("is-measuring")
  for (const s of slabs) s.build()
  document.body.classList.remove("is-measuring")
}

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
const crawlReadout = $("[data-crawl]")
const tl = gsap.timeline({ paused: true, delay: 0.15 })
tl.to(heroSlab.u.uFill, { value: 1, duration: 1.75, ease: "power2.inOut" }, 0)
pourOrder.forEach((bi, k) =>
  tl.to(
    intro.fills[bi],
    { v: 1, duration: 0.7, ease: "power2.inOut" },
    0.75 + k * 0.1
  )
)
tl.eventCallback("onUpdate", () => {
  const avg =
    (heroSlab.u.uFill.value * 2 +
      intro.fills.reduce((s, f) => s + f.v, 0) / blocks.length) /
    3
  countEl.textContent = String(Math.round(avg * 100)).padStart(3, "0")
  barEl.style.transform = `scaleX(${avg})`
  if (labelEl.textContent === "Indexing")
    tempEl.textContent = `${Math.round(avg * 7412).toLocaleString("en")} pages`
})
tl.call(
  () => {
    labelEl.textContent = "Cooling"
  },
  null,
  1.95
)
tl.to(
  intro,
  {
    molten: 0,
    duration: 1.0,
    ease: "power2.in",
    onUpdate: () => {
      tempEl.textContent = `${Math.round(20 + 1518 * intro.molten)} °C`
    },
  },
  1.95
)
tl.to(
  heroSlab.u.uSlabMolten,
  { value: 0, duration: 1.1, ease: "power2.in" },
  1.95
)
tl.to(heroSlab.u.uSeam, { value: 0.42, duration: 0.8, ease: "power2.out" }, 2.2)
tl.to(
  heroSlab.u.uLetterWarm,
  { value: 0.14, duration: 1.2, ease: "power2.out" },
  2.4
)
tl.to(intro, { seam: 0.42, duration: 1.3, ease: "power2.out" }, 2.1)
tl.to(".loader", { opacity: 0, duration: 0.6, ease: "power2.out" }, 2.2)
tl.to(intro, { k: 1, duration: 1.2, ease: "expo.inOut" }, 2.0)
tl.to(heroSlab.u.uLit, { value: 1, duration: 1.2, ease: "power2.out" }, 2.0)
tl.to(
  heroSlab.u.uReveal,
  { value: 1.2, duration: 1.6, ease: "power1.in" },
  2.35
)
tl.call(
  () => {
    heroSlab.crawlStart = clock.elapsedTime
  },
  null,
  2.9
)
tl.to(heroSlab.u.uCrawlOn, { value: 1, duration: 1.0, ease: "power2.out" }, 2.9)
tl.to(
  ".hero .reveal > span",
  { y: 0, duration: 1.1, ease: "expo.out", stagger: 0.06 },
  2.6
)
tl.call(
  () => {
    intro.done = true
    document.body.classList.remove("is-loading")
    $(".loader").remove()
  },
  null,
  3.5
)

document.fonts
  .load(`500 12px "Fira Code"`)
  .then(() => document.fonts.load(`800 100px "Tektur"`))
  .then(() => document.fonts.ready)
  .then(() => {
    buildSlabs()
    tl.play()
    ScrollTrigger.refresh()
  })
let rebuildT = 0
addEventListener("resize", () => {
  clearTimeout(rebuildT)
  rebuildT = setTimeout(buildSlabs, 200)
})

/* ---------------- Scroll reveals (DOM) ---------------- */
for (const head of $$(".chapter__head")) {
  ScrollTrigger.create({
    trigger: head,
    start: "top 85%",
    end: "top 35%",
    scrub: 0.6,
    onUpdate: (s) => head.style.setProperty("--line", s.progress.toFixed(3)),
  })
  ScrollTrigger.create({
    trigger: head,
    start: "top 70%",
    once: true,
    onEnter: () => head.classList.add("is-hot"),
  })
}
gsap.to(".about__statement .w > span", {
  y: 0,
  duration: 1,
  ease: "expo.out",
  stagger: 0.025,
  scrollTrigger: {
    trigger: ".about__statement",
    start: "top 95%",
    onEnter: () => $(".about__statement").classList.add("is-hot"),
  },
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
    scrollTrigger: {
      trigger: dt,
      start: "top 88%",
      onEnter: () => dt.classList.add("is-hot"),
    },
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
  scrollTrigger: {
    trigger: ".projects",
    start: "top 80%",
    onEnter: () => $(".projects").classList.add("is-hot"),
  },
})
gsap.from(".post", {
  y: 80,
  opacity: 0,
  duration: 1.1,
  ease: "expo.out",
  stagger: 0.1,
  scrollTrigger: { trigger: ".posts", start: "top 85%" },
})
// The footer slab is poured as it comes into view, then the crawlers start on it.
ScrollTrigger.create({
  trigger: ".contact",
  start: "top 70%",
  once: true,
  onEnter: () => {
    const u = footSlab.u
    gsap
      .timeline()
      .to(u.uLit, { value: 1, duration: 0.6 }, 0)
      .to(u.uFill, { value: 1, duration: 1.5, ease: "power2.inOut" }, 0)
      .to(u.uSlabMolten, { value: 0.0, duration: 1.2, ease: "power2.in" }, 1.6)
      .to(u.uSeam, { value: 0.6, duration: 0.8 }, 1.8)
      .to(u.uLetterWarm, { value: 0.16, duration: 1 }, 1.9)
      .to(u.uReveal, { value: 1.2, duration: 1.4, ease: "power1.in" }, 1.5)
      .call(
        () => {
          footSlab.crawlStart = clock.elapsedTime
        },
        null,
        2.2
      )
      .to(u.uCrawlOn, { value: 1, duration: 1 }, 2.2)
      .to(u.uHotA2, { value: 0.85, duration: 1.2 }, 2.4)
  },
})

/* ---------------- Frame ---------------- */
const clock = new THREE.Clock()
let scrolled = false
let shownLine = -1

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
  const ik = intro.k
  const hx = easeInOut(clamp(-hero.y / (hero.h * 0.75)))
  const kF = easeInOut(clamp((vh * 1.0 - footer.y) / (vh * 0.75)))
  const isScrolled = hx > 0.95
  if (isScrolled !== scrolled) {
    scrolled = isScrolled
    document.body.classList.toggle("is-scrolled", scrolled)
  }

  // Pointer → heat source with lag.
  const active =
    intro.done && performance.now() - pointer.last < 1800 && pointer.inside
  pointer.speed *= Math.exp(-dt * 1.8)
  toWorld(pointer.x, pointer.y, pointerWorld)
  shared.uHeatPoint.value.lerp(pointerWorld, 1 - Math.exp(-dt * 7))
  const heatGoal = active ? 0.62 + 0.5 * pointer.speed : 0
  shared.uHeatAmt.value = lerp(
    shared.uHeatAmt.value,
    heatGoal,
    1 - Math.exp(-dt * (heatGoal > shared.uHeatAmt.value ? 4 : 1.4))
  )
  shared.uHeatR.value = 1.6 + 0.9 * pointer.speed
  fill.position.set(shared.uHeatPoint.value.x, shared.uHeatPoint.value.y, 2.5)
  fill.intensity = shared.uHeatAmt.value * 45

  // Slabs: position, crawl clock, hover heat.
  for (const s of slabs) {
    s.update(dt)
    if (s.crawlStart != null)
      s.u.uCrawlT.value = t - s.crawlStart + s.u.uLineDur.value * 0.5
  }
  if (footSlab.ready) {
    // The email is cast too; hovering or focusing it pours it molten again.
    const target = emailHover ? 1 : 0
    footSlab.emailHeat = lerp(
      footSlab.emailHeat ?? 0,
      target,
      1 - Math.exp(-dt * (target ? 6 : 1.5))
    )
    const r = email.getBoundingClientRect(),
      root = footSlab.root.getBoundingClientRect()
    const ox = footSlab.margin.x - root.left,
      oy = footSlab.margin.top - root.top
    footSlab.u.uHotR.value.set(
      r.left + ox - 10,
      r.top + oy - 10,
      r.right + ox + 10,
      r.bottom + oy + 10
    )
    // At rest the email stays warm enough to read as the link; hover pours it white-hot.
    footSlab.u.uHotA.value = Math.max(
      footSlab.emailHeat,
      footSlab.u.uCrawlOn.value * 0.42
    )
    if (footSlab.u.uCrawlOn.value > 0.5)
      footSlab.u.uHotA2.value = 0.8 + 0.1 * Math.sin(t * 1.4)
  }
  // Readout: the URL the first crawler is reading right now.
  if (heroSlab.ready && heroSlab.crawlStart != null) {
    const u = heroSlab.u,
      P = u.uRows.value * u.uLineDur.value
    const rank = Math.floor(
      (((u.uCrawlT.value % P) + P) % P) / u.uLineDur.value
    )
    const l = heroSlab.lineOfRank[rank]
    if (l !== shownLine && heroSlab.lines[l]) {
      shownLine = l
      crawlReadout.textContent = heroSlab.lines[l].url
    }
  }
  heroSlab.u.uLetterWarm.value = intro.done
    ? 0.14 + 0.04 * Math.sin(t * 1.1)
    : heroSlab.u.uLetterWarm.value
  heroSlab.u.uSeam.value = intro.done
    ? 0.4 + 0.1 * Math.sin(t * 0.9)
    : heroSlab.u.uSeam.value

  blocks.forEach((b, i) => {
    logoSlot(heroLogo, i, sB)
    const p = sB.pos.clone()
    let scale = sB.scale
    let rx = lerp(-0.14, -0.26, ik),
      ry = lerp(0.22, 0.36, ik),
      rz = 0
    let z = 0
    if (hx > 0) {
      logoSlot(dock, i, sC)
      const w = hx
      p.lerp(sC.pos, w)
      scale = lerp(scale, sC.scale, w)
      rx = lerp(rx, -0.2, w)
      ry = lerp(ry, 0.3, w)
      z += Math.sin(Math.PI * w) * 3.5 + w * 0.8
      rz += Math.sin(Math.PI * w) * (i % 2 ? 0.6 : -0.6)
    }
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
    if (kF > 0) {
      logoSlot(footer, i, sC)
      p.lerp(sC.pos, kF)
      scale = lerp(scale, sC.scale, kF)
      rx = lerp(rx, -0.22, kF)
      ry = lerp(ry, 0.3, kF)
      z = lerp(z, 0, kF) + Math.sin(Math.PI * kF) * 4
    }

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

    const idle = (1 - hx) * ik
    z += Math.sin(t * 0.9 + b.phase) * 0.12 * idle * scale
    rx += Math.sin(t * 0.6 + b.phase) * 0.03 * idle

    b.group.position.set(p.x, p.y, z)
    b.group.scale.setScalar(Math.max(scale, 0.0001))
    b.group.rotation.set(rx + b.tilt.x, ry + b.tilt.y, rz)

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
  })

  // Camera: slight pointer parallax.
  const px = pointer.x / vw - 0.5,
    py = pointer.y / vh - 0.5
  camera.position.x = lerp(camera.position.x, px * 0.5, 1 - Math.exp(-dt * 2))
  camera.position.y = lerp(camera.position.y, -py * 0.35, 1 - Math.exp(-dt * 2))
  camera.lookAt(camera.position.x * 0.6, camera.position.y * 0.6, 0)
  key.position.x = -8 + Math.sin(t * 0.25) * 3
  scene.environmentIntensity = lerp(0.18, 0.95, ik)
  key.intensity = lerp(0.9, 2.6, ik)
  rim.intensity = lerp(0.3, 1.4, ik)

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
