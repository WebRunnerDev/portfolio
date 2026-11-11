// Renders the static Motion Tier: the Cast Lattice at rest
// (docs/design-brief.md › Cast Lattice) as a still image, one per theme.
// Run: node scripts/generate-hero-static.mjs
// Outputs: src/pages/home/ui/grid-{light,dark}.webp, 2560 × 1440, opaque
// `surface` like the scene's canvas.
// Each cell is the scene's prism seen from above: its top and four 45°
// bevels in the flat colors the shader gives them under the key light at
// rest (src/pages/home/lib/cast-lattice/), the rims a one-pixel line, and a
// few rust prisms where a still of the swell lights them. Lossless WebP: the
// flat faces compress well; AVIF loses on this line art.
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const out = fileURLToPath(new URL("../src/pages/home/ui/", import.meta.url))

const WIDTH = 2560
const HEIGHT = 1440
// The scene's lattice (lattice.ts), prism (prism.ts) and light
// (cast-lattice.ts, shaders.ts).
const STEP = 48
const HALF = STEP / 2
const BEVEL = 5
const TOP = HALF - BEVEL * Math.SQRT2
const AZIMUTH = (-3 * Math.PI) / 4
const ELEVATION = (38 * Math.PI) / 180
const LIGHT = [
  Math.cos(ELEVATION) * Math.cos(AZIMUTH),
  Math.cos(ELEVATION) * Math.sin(AZIMUTH),
  Math.sin(ELEVATION),
]
const SWELL_SPREAD = 4 * STEP
const SWELL_DENSITY = 0.04

// DESIGN.md colors: faces from `surface` toward `surface-raised`, rims
// `outline-muted`, rust `primary`.
const THEMES = {
  light: {
    surface: "#F3F4F6",
    raised: "#E5E7EB",
    edge: "#D1D5DB",
    crest: "#B84530",
  },
  dark: {
    surface: "#121212",
    raised: "#1E1E1E",
    edge: "#2E2E2E",
    crest: "#B84530",
  },
}

const random = (i, j) => {
  const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return x - Math.floor(x)
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const hex = (channels) =>
  `#${channels
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

// The corners clockwise on screen (y down): right, down, left, up. Face 0
// is the top; face k + 1 the bevel from corner k to corner k + 1.
const CORNERS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
]
const NORMALS = [
  [0, 0, 1],
  ...CORNERS.map(([x0, y0], k) => {
    const [x1, y1] = CORNERS[(k + 1) % 4]
    return [(x0 + x1) / 2, (y0 + y1) / 2, Math.SQRT1_2]
  }),
]
const LIGHTS = NORMALS.map((normal) => Math.max(dot(normal, LIGHT), 0))

// The shader's face colors: `surface` stepped toward the light, and lit rust.
function faces({ surface, raised, crest }) {
  const base = rgb(surface)
  const step = rgb(raised).map((c, i) => c - base[i])
  const sign = step.reduce((sum, c) => sum + c, 0) >= 0 ? 1 : -1
  return {
    rest: LIGHTS.map((light) =>
      hex(base.map((c, i) => c + sign * step[i] * (light - LIGHT[2]) * 1.5))
    ),
    crest: LIGHTS.map((light) =>
      hex(rgb(crest).map((c) => c * (0.62 + 0.5 * light)))
    ),
  }
}

const point = (cx, cy, [x, y], r) => `${cx + x * r} ${cy + y * r}`

// The five faces' outlines of a prism at (cx, cy).
function prism(cx, cy) {
  const top = `M${CORNERS.map((c) => point(cx, cy, c, TOP)).join("L")}Z`
  const bevels = CORNERS.map((c0, k) => {
    const c1 = CORNERS[(k + 1) % 4]
    return `M${point(cx, cy, c0, HALF)}L${point(cx, cy, c1, HALF)}L${point(cx, cy, c1, TOP)}L${point(cx, cy, c0, TOP)}Z`
  })
  return [top, ...bevels]
}

// A still of the swell (shaders.ts) with its band's middle at FRONT: the
// picked cells it lights whole.
const FRONT = 0.68 * WIDTH
function lit(i, j, cx) {
  if (random(i, j) >= SWELL_DENSITY) return false
  const near = Math.exp(-(((cx - FRONT) / SWELL_SPREAD) ** 2))
  return near - 0.5 - 0.4 * random(j, i) >= 0.06
}

function cells() {
  const rest = Array.from({ length: 5 }, () => [])
  const crest = Array.from({ length: 5 }, () => [])
  for (let j = -1; j <= HEIGHT / HALF + 1; j++) {
    for (let i = -1; i <= WIDTH / HALF + 1; i++) {
      // Cell centers sit where i + j is odd: between the lattice points.
      if ((i + j) % 2 === 0) continue
      const cx = i * HALF
      const cy = j * HALF
      const into = lit(i, j, cx) ? crest : rest
      prism(cx, cy).forEach((d, face) => into[face].push(d))
    }
  }
  return { rest, crest }
}

function lines() {
  // x + y = k·STEP and x − y = k·STEP, across the whole image.
  const d = []
  for (let k = 0; k <= (WIDTH + HEIGHT) / STEP; k++) {
    const c = k * STEP
    d.push(`M${c} 0L${c - HEIGHT} ${HEIGHT}`)
  }
  for (let k = -HEIGHT / STEP; k <= WIDTH / STEP; k++) {
    const c = k * STEP
    d.push(`M${c} 0L${c + HEIGHT} ${HEIGHT}`)
  }
  return d.join("")
}

function svg(theme) {
  const colors = faces(theme)
  const { rest, crest } = cells()
  const paths = (shapes, fills) =>
    shapes
      .map((d, face) => `<path d="${d.join("")}" fill="${fills[face]}"/>`)
      .join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${theme.surface}"/>
  ${paths(rest, colors.rest)}
  ${paths(crest, colors.crest)}
  <path d="${lines()}" stroke="${theme.edge}" stroke-width="1" fill="none" shape-rendering="crispEdges"/>
</svg>`
}

await mkdir(out, { recursive: true })
for (const [name, theme] of Object.entries(THEMES)) {
  const webp = await sharp(Buffer.from(svg(theme)))
    .webp({ lossless: true, effort: 6 })
    .toFile(`${out}grid-${name}.webp`)
  console.log(name, `${webp.size} B`)
}
