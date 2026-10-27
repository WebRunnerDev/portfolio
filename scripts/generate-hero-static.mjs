// Renders the static Hero Tier: the rhombus grid of the Kinetic Grid
// (docs/design-brief.md › Hero effect) as a still image, one per theme.
// Run: node scripts/generate-hero-static.mjs
// Outputs: src/pages/home/ui/grid-{light,dark}.webp, 2560 × 1440,
// transparent, so the page's own surface shows through.
// Lossless WebP with crisp edges: ~15 KB. AVIF loses on this flat line art
// (~190 KB at quality 50, ~270 KB lossless), so there is none.
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const out = fileURLToPath(new URL("../src/pages/home/ui/", import.meta.url))

const WIDTH = 2560
const HEIGHT = 1440
// The grid step: the diagonals of each rhombus cell.
const STEP = 48

// DESIGN.md colors: lines `outline-muted`, points `outline`, lit cells
// `primary`, at most 90% opaque.
const THEMES = {
  light: { line: "#D1D5DB", point: "#6B7280", fill: "#B84530" },
  dark: { line: "#2E2E2E", point: "#6B7280", fill: "#B84530" },
}

// A still of the wave crossing the grid from left to right: cells near its
// front are lit, fewer and fainter the further they are. Deterministic, so
// the image only changes with this script.
const random = (i, j) => {
  const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return x - Math.floor(x)
}
const FRONT = 0.68 * WIDTH
const SPREAD = 0.1 * WIDTH
// DESIGN.md: rust stays a few tiles, never a large fill.
const DENSITY = 0.1

function cells() {
  const lit = []
  const half = STEP / 2
  for (let j = -1; j <= HEIGHT / half + 1; j++) {
    for (let i = -1; i <= WIDTH / half + 1; i++) {
      // Cell centers sit where i + j is odd: between the lattice points.
      if ((i + j) % 2 === 0) continue
      const cx = i * half
      const cy = j * half
      const near = Math.exp(-(((cx - FRONT) / SPREAD) ** 2))
      if (random(i, j) > near * DENSITY) continue
      const opacity =
        Math.round(0.9 * near * (0.3 + 0.7 * random(j, i)) * 100) / 100
      if (opacity < 0.08) continue
      lit.push(
        `<path d="M${cx} ${cy - half}L${cx + half} ${cy}L${cx} ${cy + half}L${cx - half} ${cy}Z" fill-opacity="${opacity}"/>`
      )
    }
  }
  return lit.join("")
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

function points() {
  const half = STEP / 2
  const d = []
  for (let j = 0; j <= HEIGHT / half; j++) {
    for (let i = 0; i <= WIDTH / half; i++) {
      if ((i + j) % 2 !== 0) continue
      d.push(`M${i * half - 1} ${j * half}h2`)
    }
  }
  return d.join("")
}

const svg = ({
  line,
  point,
  fill,
}) => `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <g fill="${fill}" shape-rendering="crispEdges">${cells()}</g>
  <path d="${lines()}" stroke="${line}" stroke-width="1" fill="none" shape-rendering="crispEdges"/>
  <path d="${points()}" stroke="${point}" stroke-width="2"/>
</svg>`

await mkdir(out, { recursive: true })
for (const [theme, colors] of Object.entries(THEMES)) {
  const image = sharp(Buffer.from(svg(colors)))
  const webp = await image
    .webp({ lossless: true, effort: 6 })
    .toFile(`${out}grid-${theme}.webp`)
  console.log(theme, `${webp.size} B`)
}
