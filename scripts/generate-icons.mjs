// Renders raster icons from public/logo.svg with Playwright's Chromium.
// Run: node scripts/generate-icons.mjs
// Outputs: public/favicon.ico (32px), public/apple-touch-icon.png (180px),
// public/og-default.png (1200x630 placeholder until stage 6 OG injection).
import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const root = fileURLToPath(new URL("..", import.meta.url))
const publicDir = `${root}public/`

// Dark-mode tokens from DESIGN.md: one opaque tile set reads on light and dark tabs.
const SURFACE = "#121212"
const ON_SURFACE = "#E0E0E0"
const PRIMARY = "#B84530"
const OUTLINE_MUTED = "#2E2E2E"

const logoSource = await readFile(`${publicDir}logo.svg`, "utf8")
const tiles = [...logoSource.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1])
if (tiles.length !== 7)
  throw new Error(`Expected 7 logo tiles, got ${tiles.length}`)

const logo = (size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 10 10" fill="${ON_SURFACE}">${tiles
    .map((d) => `<path d="${d}"/>`)
    .join("")}</svg>`

// Inlined as a data URL: Chromium blocks file:// fonts on an about:blank page.
const tektur = await readFile(
  `${root}node_modules/@fontsource-variable/tektur/files/tektur-latin-wght-normal.woff2`
)
const tekturUrl = `data:font/woff2;base64,${tektur.toString("base64")}`

const page = (width, height, body) => `<!doctype html>
<html><head><style>
  @font-face { font-family: "Tektur"; src: url("${tekturUrl}") format("woff2"); font-weight: 400 900; }
  html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
  body { background: ${SURFACE}; display: flex; align-items: center; justify-content: center; }
  svg { display: block; }
</style></head><body>${body}</body></html>`

const square = (size, inset) => page(size, size, logo(size - inset * 2))

const og = page(
  1200,
  630,
  `<div style="box-sizing:border-box;width:1200px;height:630px;padding:96px;border:1px solid ${OUTLINE_MUTED};display:flex;flex-direction:column;justify-content:center;gap:48px">
    ${logo(220)}
    <div style="font-family:Tektur;font-weight:600;font-size:112px;line-height:1;color:${ON_SURFACE}">WebRunner</div>
    <div style="width:96px;height:6px;background:${PRIMARY}"></div>
  </div>`
)

async function render(browser, html, width, height) {
  const tab = await browser.newPage({ viewport: { width, height } })
  await tab.setContent(html)
  await tab.evaluate(() => document.fonts.ready)
  const png = await tab.screenshot({ type: "png" })
  await tab.close()
  return png
}

// ICO container with a single embedded PNG image (supported by all current browsers).
function ico(png, size) {
  const header = Buffer.alloc(6 + 16)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  header.writeUInt8(size, 6)
  header.writeUInt8(size, 7)
  header.writeUInt8(0, 8)
  header.writeUInt8(0, 9)
  header.writeUInt16LE(1, 10)
  header.writeUInt16LE(32, 12)
  header.writeUInt32LE(png.length, 14)
  header.writeUInt32LE(header.length, 18)
  return Buffer.concat([header, png])
}

const browser = await chromium.launch()
try {
  const favicon = await render(browser, square(32, 3), 32, 32)
  await writeFile(`${publicDir}favicon.ico`, ico(favicon, 32))
  await writeFile(
    `${publicDir}apple-touch-icon.png`,
    await render(browser, square(180, 30), 180, 180)
  )
  await writeFile(
    `${publicDir}og-default.png`,
    await render(browser, og, 1200, 630)
  )
} finally {
  await browser.close()
}
