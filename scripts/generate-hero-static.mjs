// Renders the static Motion Tier: the hero with the Swarm at rest
// (docs/design-brief.md › Главная на Swarm › `lite` и `static`), a still of
// the real scene, one per theme and per orientation.
// Run: node scripts/generate-hero-static.mjs (builds the app first; add
// --no-build to use dist/ as it is).
// Outputs: src/pages/home/ui/swarm-{light,dark}-{landscape,portrait}.webp,
// each at most BUDGET bytes (the owner's, #185).
//
// It serves the build through the Worker (`vite preview`), opens the home
// page in Chromium at `full` on the GPU (software WebGL may drop the scene
// to `lite` at this size), passes the input gate and lets the intro end,
// then takes the pointer off the page. The text is hidden, not removed, so
// the web still steps out of it. Of a few frames at rest it keeps the
// calmest (the logo least warm: no splash on it), at the hero's CSS
// size times its scale. The grain on the empty `surface` is flattened (it is
// noise the encoder would pay for) and the dust softened a little; then the
// highest WebP quality within BUDGET.
import { spawn } from "node:child_process"
import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"
import sharp from "sharp"

const root = fileURLToPath(new URL("..", import.meta.url))
const out = `${root}src/pages/home/ui/`
const PORT = 4177
const URL_ = `http://localhost:${PORT}/en`

const BUDGET = 11 * 1024
const FRAMES = [
  // The reference desktop (#185) and phone: the logo square sits where the
  // scene lays it at each breakpoint.
  { name: "landscape", width: 1440, height: 900, scale: 1 },
  { name: "portrait", width: 390, height: 844, scale: 1.5 },
]
// Past the FPS probe, then past the intro (src/pages/home/lib/swarm/
// intro.ts: INTRO_MS) and the pointer going idle.
const PROBE_MS = 3000
const SETTLE_MS = 6500
const SHOTS = 40
const SHOT_GAP_MS = 250
// The logo square and this much around it, where a splash shows.
const AROUND = 0.15
// Off the empty surface: within this of it is grain.
const GRAIN = 5
const SOFTEN = 0.6

// Everything but the scene hidden, the scrollbar too (the frame is the
// hero's full width).
const BARE = `
  html { scrollbar-width: none }
  body * { visibility: hidden !important }
  [data-effect="full"] { visibility: visible !important }
`

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  })
  return child
}

async function waitFor(url, ms = 60_000) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error(`${url} did not come up`)
}

// How warm the logo is in a frame: a splash flashes its dust rust (the
// logo's own threads are warm in every frame alike).
async function warmth(png, box) {
  const data = await sharp(png).extract(box).removeAlpha().raw().toBuffer()
  let sum = 0
  for (let i = 0; i < data.length; i += 3) {
    const warm = data[i] - data[i + 2] - 25
    if (warm > 0) sum += warm
  }
  return sum
}

async function shoot(browser, theme, frame) {
  const page = await browser.newPage({
    viewport: { width: frame.width, height: frame.height },
    deviceScaleFactor: 2,
    colorScheme: theme,
  })
  // A device past every `lite` limit (as e2e/full-layer.spec.ts).
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 16 })
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 })
  })
  await page.goto(URL_)
  await page.addStyleTag({ content: BARE })
  await page.waitForTimeout(PROBE_MS)
  await page.mouse.move(frame.width - 1, 1)
  await page.waitForSelector('[data-effect="full"][data-ready="true"]', {
    timeout: 20_000,
  })
  // The pointer leaves: no parallax, no parting, no lean.
  await page.evaluate(
    "window.dispatchEvent(new PointerEvent('pointerout', { pointerType: 'mouse' }))"
  )
  await page.waitForTimeout(SETTLE_MS)
  const hero = await page.locator("section[data-tier]").boundingBox()
  const logo = await page.locator('[data-swarm-anchor="hero"]').boundingBox()
  // In the screenshot's device pixels, within the hero.
  const pad = logo.width * AROUND
  const left = Math.max(0, Math.round((logo.x - pad - hero.x) * 2))
  const top = Math.max(0, Math.round((logo.y - pad - hero.y) * 2))
  const box = {
    left,
    top,
    width: Math.min(
      Math.round((logo.width + 2 * pad) * 2),
      Math.floor(hero.width * 2) - left
    ),
    height: Math.min(
      Math.round((logo.height + 2 * pad) * 2),
      Math.floor(hero.height * 2) - top
    ),
  }
  let best = null
  for (let i = 0; i < SHOTS; i++) {
    const png = await page.screenshot({ clip: hero })
    const score = await warmth(png, box)
    if (!best || score < best.score) best = { png, score }
    await page.waitForTimeout(SHOT_GAP_MS)
  }
  const tier = await page.getAttribute("section[data-tier]", "data-tier")
  await page.close()
  if (tier !== "full") {
    throw new Error(`${theme} ${frame.name}: the scene fell to ${tier}`)
  }
  return {
    png: best.png,
    width: Math.round(hero.width * frame.scale),
    height: Math.round(hero.height * frame.scale),
  }
}

async function encode({ png, width, height }) {
  const { data, info } = await sharp(png)
    .removeAlpha()
    .resize(width, height, { kernel: "lanczos3" })
    .blur(SOFTEN)
    .raw()
    .toBuffer({ resolveWithObject: true })
  // The surface is the most common color.
  const counts = new Map()
  for (let i = 0; i < data.length; i += 3) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const key = [...counts].reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  const surface = [key >> 16, (key >> 8) & 255, key & 255]
  for (let i = 0; i < data.length; i += 3) {
    if (surface.every((c, k) => Math.abs(data[i + k] - c) <= GRAIN)) {
      data.set(surface, i)
    }
  }
  const image = sharp(data, { raw: info })
  // The highest quality within the budget.
  let fit = null
  let lo = 10
  let hi = 90
  while (lo <= hi) {
    const quality = Math.floor((lo + hi) / 2)
    const webp = await image.clone().webp({ quality, effort: 6 }).toBuffer()
    if (webp.length <= BUDGET) {
      fit = { webp, quality }
      lo = quality + 1
    } else {
      hi = quality - 1
    }
  }
  if (!fit) throw new Error(`no quality fits ${BUDGET} B`)
  return fit
}

if (!process.argv.includes("--no-build")) {
  const build = run("npm", ["run", "build"])
  const code = await new Promise((resolve) => build.on("exit", resolve))
  if (code !== 0) process.exit(code ?? 1)
}
const server = run(
  "npx",
  ["vite", "preview", "--port", String(PORT), "--strictPort"],
  { stdio: "ignore", detached: true }
)
try {
  await waitFor(URL_)
  const browser = await chromium.launch({
    args: [
      "--use-gl=angle",
      "--use-angle=gl-egl",
      "--ignore-gpu-blocklist",
      "--enable-gpu",
    ],
  })
  try {
    for (const theme of ["light", "dark"]) {
      for (const frame of FRAMES) {
        const shot = await shoot(browser, theme, frame)
        const { webp, quality } = await encode(shot)
        const file = `swarm-${theme}-${frame.name}.webp`
        await writeFile(`${out}${file}`, webp)
        console.log(
          `${file}: ${shot.width} × ${shot.height}, q${quality}, ${webp.length} B`
        )
      }
    }
  } finally {
    await browser.close()
  }
} finally {
  process.kill(-server.pid)
}
