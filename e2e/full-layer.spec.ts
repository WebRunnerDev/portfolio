import { expect, test, type Page } from "@playwright/test"

// ADR-0012: the full layer loads only at the `full` Motion Tier and after the
// visitor's first input, never with the page or in its modulepreloads.
const FULL_CHUNK = /home-full/
const hero = (page: Page) => page.locator("section[data-tier]")
// The Swarm's canvas: the home page's, behind the whole page (ADR-0013).
const scene = (page: Page) => page.locator("[data-effect=full]")
// The FPS probe's run (MotionTierProvider): past it, the first input loads
// the full layer at once.
const PAST_PROBE_MS = 2_500

// Headless Chromium draws WebGL in software (SwiftShader). At this size it
// holds the 40 fps the scene needs, so the FPS meter doesn't drop it to
// `lite` in the middle of a test.
test.use({ viewport: { width: 640, height: 480 } })

// The device hints the scene's level reads (ADR-0013): 16 cores and 8 GB
// a strong device, 2 cores a weak one.
async function device(page: Page, cores: number) {
  await page.addInitScript((cores) => {
    Object.defineProperty(navigator, "hardwareConcurrency", {
      get: () => cores,
    })
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 })
  }, cores)
}
const strongDevice = (page: Page) => device(page, 16)

// The URLs of the full layer's chunk the page asked for.
function fullRequests(page: Page) {
  const urls: string[] = []
  page.on("request", (request) => {
    if (FULL_CHUNK.test(request.url())) urls.push(request.url())
  })
  return urls
}

test("the full layer waits for the first input", async ({ page }) => {
  await strongDevice(page)
  const requests = fullRequests(page)
  await page.goto("/en")
  await expect(hero(page)).toHaveAttribute("data-tier", "lite")
  // Past the FPS probe. Chrome's own pointermove after the first layout (no
  // movement) and a scroll don't count as input.
  await page.waitForTimeout(5_000)
  await page.evaluate("window.scrollBy(0, 200)")
  await page.waitForTimeout(500)
  expect(requests).toEqual([])
  await expect(hero(page)).toHaveAttribute("data-tier", "lite")

  const chunk = page.waitForRequest(FULL_CHUNK)
  await page.mouse.move(200, 200)
  await chunk
  await expect(hero(page)).toHaveAttribute("data-tier", "full")
  await expect(scene(page)).toHaveAttribute("data-ready", "true")
  // `lite` gave way to the scene.
  await expect(hero(page).locator("[data-effect]")).toHaveCount(0)
})

// ADR-0013: a weak device is a `full` candidate like any other; after the
// first input it gets the chunk, at the lite level of its class.
for (const [viewport, level] of [
  [{ width: 1280, height: 800 }, "desktop-lite"],
  [{ width: 390, height: 844 }, "mobile-lite"],
] as const) {
  test(`a weak device gets the scene after input, at ${level}`, async ({
    page,
  }) => {
    await device(page, 2)
    await page.setViewportSize(viewport)
    const chunk = page.waitForRequest(FULL_CHUNK)
    await page.goto("/en")
    await page.waitForTimeout(PAST_PROBE_MS)
    await page.mouse.move(200, 200)
    await chunk
    await expect(scene(page)).toHaveAttribute("data-quality", level)
    await expect(scene(page)).toHaveAttribute("data-ready", "true")
  })
}

test("the scene fades in over lite after its first frame, nothing shifts", async ({
  page,
}) => {
  await strongDevice(page)
  // Each change in the hero's effects, in order (`lite`, `full` and whether
  // the scene drew its first frame), and every layout shift.
  await page.addInitScript(`
    window.effects = []
    new MutationObserver(() => {
      const now = [...document.querySelectorAll("[data-effect]")]
        .map(({ dataset }) =>
          dataset.effect + (dataset.ready === "true" ? " drawn" : ""))
        .join(", ")
      if (window.effects.at(-1) !== now) window.effects.push(now)
    }).observe(document, {
      subtree: true,
      childList: true,
      attributeFilter: ["data-effect", "data-ready"],
    })
    window.shifts = []
    new PerformanceObserver((list) => window.shifts.push(...list.getEntries()))
      .observe({ type: "layout-shift", buffered: true })
  `)
  await page.goto("/en")
  await page.waitForTimeout(PAST_PROBE_MS)
  const input = await page.evaluate("performance.now()")
  await page.mouse.move(200, 200)

  const canvas = scene(page)
  await expect(canvas).toHaveAttribute("data-ready", "true", {
    timeout: 10_000,
  })
  // DESIGN.md › Motion: `duration-slow`, `easing-enter`.
  await expect(canvas).toHaveCSS("transition-duration", "0.4s")
  await expect(canvas).toHaveCSS(
    "transition-timing-function",
    "cubic-bezier(0.16, 1, 0.3, 1)"
  )
  await expect(hero(page).locator("[data-effect]")).toHaveCount(0)
  await expect(canvas).toHaveCSS("opacity", "1")
  // `lite` stayed under the scene until it drew, faded out as it faded in
  // (DESIGN.md › Motion: `duration-slow`, `easing-exit`), then left.
  const effects = await page.evaluate("window.effects")
  expect((effects as string[]).slice(-3)).toEqual([
    "lite, full",
    "lite, full drawn",
    "full drawn",
  ])
  // A fixed layer and an absolute readout: no layout shift from the input
  // on, not even in the 500 ms after it that CLS leaves out.
  const shifts = await page.evaluate(
    `window.shifts.filter((entry) => entry.startTime > ${input}).length`
  )
  expect(shifts).toBe(0)
})

// A new Lang lays the scene again on a canvas of its own: it starts, and
// fades in on its first frame like the first one. The canvas is opaque: shown
// before it draws, it is black over the page.
test("a new Lang lays the scene again and it draws", async ({ page }) => {
  await strongDevice(page)
  await page.goto("/en")
  await page.waitForTimeout(PAST_PROBE_MS)
  await page.mouse.move(200, 200)
  await expect(scene(page)).toHaveAttribute("data-ready", "true", {
    timeout: 10_000,
  })
  await page.evaluate(`
    window.canvases = []
    new MutationObserver(() => {
      const now = [...document.querySelectorAll("[data-effect=full]")]
        .map(({ dataset }) => (dataset.ready === "true" ? "drawn" : "blank"))
        .join(", ")
      if (window.canvases.at(-1) !== now) window.canvases.push(now)
    }).observe(document, {
      subtree: true,
      childList: true,
      attributeFilter: ["data-effect", "data-ready"],
    })
  `)
  const old = await scene(page).elementHandle()

  // Below `lg` the Lang is in the menu, as on a phone.
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click()
  await page
    .getByRole("dialog", { name: "Menu" })
    .getByRole("link", { name: /Русский/ })
    .click()
  await expect(page).toHaveURL(/\/ru$/)

  await expect
    .poll(() => old!.evaluate((canvas) => canvas.isConnected))
    .toBe(false)
  await expect(scene(page)).toHaveAttribute("data-ready", "true", {
    timeout: 10_000,
  })
  await expect(scene(page)).toHaveAttribute("data-playing", "true")
  const canvases = (await page.evaluate("window.canvases")) as string[]
  expect(canvases).toContain("blank")
  expect(canvases.at(-1)).toBe("drawn")
})

// Issue #186: while the scene runs the footer holds the square its blocks
// gather into, above the label below `lg`.
test("the scene opens the footer's square for the logo", async ({ page }) => {
  await strongDevice(page)
  await page.goto("/en")
  const square = page.locator('footer [data-swarm-anchor="footer"]')
  await expect(square).toHaveCSS("display", "none")
  await page.waitForTimeout(PAST_PROBE_MS)
  await page.mouse.move(200, 200)
  await expect(scene(page)).toHaveAttribute("data-ready", "true", {
    timeout: 10_000,
  })
  await expect(square).toHaveCSS("display", "block")
  const box = (await square.boundingBox())!
  expect(box.width).toBeGreaterThan(0)
  expect(box.width).toBeCloseTo(box.height)
  const label = (await page.locator("footer p").first().boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(label.y)
})

test("a full chunk that fails to load leaves lite for the visit", async ({
  page,
}) => {
  await strongDevice(page)
  const errors: string[] = []
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource")
    ) {
      errors.push(message.text())
    }
  })
  await page.route(FULL_CHUNK, (route) => route.abort())
  await page.goto("/en?motion")
  await page.waitForTimeout(PAST_PROBE_MS)
  const failed = page.waitForEvent("requestfailed", (request) =>
    FULL_CHUNK.test(request.url())
  )
  await page.mouse.move(200, 200)
  await failed
  await expect(hero(page)).toHaveAttribute("data-tier", "lite")
  await expect(hero(page).locator("[data-effect]")).toHaveAttribute(
    "data-effect",
    "lite"
  )
  // `?motion` says why.
  await expect(page.locator("[data-motion-diagnosis]")).toHaveText(
    /^lite · probe \d+ fps \(40 needed\) · input · fell back: full chunk didn't load$/
  )
  expect(errors).toEqual([])
})

// `?motion`: a visitor whose device shows no scene can read out why. Without
// it, nobody sees the line.
test("?motion says why the tier is what it is", async ({ page }) => {
  await strongDevice(page)
  await page.goto("/en")
  await expect(hero(page)).toHaveAttribute("data-tier", "lite")
  await expect(page.locator("[data-motion-diagnosis]")).toHaveCount(0)

  await page.goto("/en?motion")
  const line = page.locator("[data-motion-diagnosis]")
  await expect(line).toHaveText(/^lite · probe running · no input yet$/)
  await expect(line).toHaveText(
    /^lite · probe \d+ fps \(40 needed\) · no input yet$/
  )
  // The first move in a new document has no movement, which isn't input.
  await page.mouse.move(100, 100)
  await page.mouse.move(200, 200)
  await expect(line).toHaveText(/^full · probe \d+ fps \(40 needed\) · input$/)
})

// ADR-0012: the chunk, its shaders and its lattice land around the first
// input; the click right after it still paints within INP's "good".
test("a click right after the first input responds within 200 ms", async ({
  page,
}) => {
  await strongDevice(page)
  await page.addInitScript(`
    window.durations = []
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId) window.durations.push(entry.duration)
      }
    }).observe({ type: "event", durationThreshold: 16, buffered: true })
  `)
  await page.goto("/en")
  await page.waitForTimeout(PAST_PROBE_MS)
  const chunk = page.waitForRequest(FULL_CHUNK)
  await page.mouse.move(200, 200)
  await hero(page).getByRole("link", { name: "View CV" }).click()
  await chunk
  await expect(page).toHaveURL(/\/en\/cv$/)
  const durations = (await page.evaluate("window.durations")) as number[]
  expect(Math.max(0, ...durations)).toBeLessThan(200)
})

test("the full chunk is in no modulepreload", async ({ page, request }) => {
  await strongDevice(page)
  const chunk = page.waitForRequest(FULL_CHUNK)
  await page.goto("/en")
  await page.mouse.move(200, 200)
  const { pathname } = new URL((await chunk).url())

  // Not in the page as served. (Once imported, Vite adds a modulepreload
  // for it to the DOM itself: that one comes after the input.)
  const html = await (await request.get("/en")).text()
  expect(html).toContain('rel="modulepreload"')
  expect(html).not.toContain(pathname)
})

test("reduced motion never loads the full layer", async ({ page }) => {
  await strongDevice(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  const requests = fullRequests(page)
  await page.goto("/en")
  await expect(hero(page)).toHaveAttribute("data-tier", "static")
  await page.mouse.move(200, 200)
  await page.keyboard.press("Tab")
  await page.waitForTimeout(3_000)
  expect(requests).toEqual([])
  await expect(hero(page)).toHaveAttribute("data-tier", "static")
})
