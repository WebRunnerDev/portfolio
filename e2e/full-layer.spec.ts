import { expect, test, type Page } from "@playwright/test"

import { headerLogo, heroTiles } from "./logo-flight"

// ADR-0012: the full layer loads only at the `full` Motion Tier and after the
// visitor's first input, never with the page or in its modulepreloads.
const FULL_CHUNK = /hero-full/
const hero = (page: Page) => page.locator("section[data-tier]")
// The FPS probe's run (MotionTierProvider): past it, the first input loads
// the full layer at once.
const PAST_PROBE_MS = 2_500

// Headless Chromium draws WebGL in software (SwiftShader). At this size it
// holds the 40 fps the scene needs, so the FPS meter doesn't drop it to
// `lite` in the middle of a test.
test.use({ viewport: { width: 640, height: 480 } })

// A device past every `lite` limit: 16 cores and 8 GB.
async function strongDevice(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 16 })
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 })
  })
}

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
  await expect(
    hero(page).locator("[data-effect=full][data-ready=true]")
  ).toBeAttached()
  await expect(hero(page).locator("[data-effect]")).toHaveCount(1)
})

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

  const canvas = hero(page).locator("[data-effect=full]")
  await expect(canvas).toHaveAttribute("data-ready", "true", {
    timeout: 10_000,
  })
  // DESIGN.md › Motion: `duration-slow`, `easing-enter`.
  await expect(canvas).toHaveCSS("transition-duration", "0.4s")
  await expect(canvas).toHaveCSS(
    "transition-timing-function",
    "cubic-bezier(0.16, 1, 0.3, 1)"
  )
  await expect(hero(page).locator("[data-effect]")).toHaveCount(1)
  await expect(canvas).toHaveCSS("opacity", "1")
  // `lite` stayed under the scene until it drew, then left.
  const effects = await page.evaluate("window.effects")
  expect((effects as string[]).slice(-3)).toEqual([
    "lite, full",
    "lite, full drawn",
    "full drawn",
  ])
  // An absolute layer: no layout shift from the input on, not even in the
  // 500 ms after it that CLS leaves out.
  const shifts = await page.evaluate(
    `window.shifts.filter((entry) => entry.startTime > ${input}).length`
  )
  expect(shifts).toBe(0)
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
  await page.goto("/en")
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
  expect(errors).toEqual([])
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

// Issue #165, docs/design-brief.md › Cast Lattice: the first part of the
// hero's exit is the rise of the scene's copies into the logo tiles; the
// header logo's flight takes off from over the tiles after it.
test("the logo flight waits for the rise at full", async ({ page }) => {
  await strongDevice(page)
  // As many pixels as 640×480, with the hero no taller than the view below
  // the header: at 640×480 it is, and its tiles reach the header before its
  // exit, so there is no rise.
  await page.setViewportSize({ width: 480, height: 640 })
  await page.goto("/en")
  await page.waitForTimeout(PAST_PROBE_MS)
  await page.mouse.move(200, 200)
  await expect(hero(page).locator("[data-effect=full]")).toHaveAttribute(
    "data-rise",
    "true",
    { timeout: 10_000 }
  )
  await page.evaluate("document.fonts.ready")
  // Without D1 (CI) the page is too short for the hero's whole exit.
  await page.evaluate(`document.body.style.paddingBottom = "200vh"`)
  // Where the hero's exit starts and how long it is (this one is taller
  // than the view), and the rise's share of it.
  const { start, length, share } = (await page.evaluate(`(() => {
    const root = document.documentElement
    const top = parseFloat(getComputedStyle(root).scrollPaddingTop)
    const box = document.querySelector("section[data-tier]").getBoundingClientRect()
    return {
      start: Math.max(box.top - top, box.bottom - root.clientHeight),
      length: Math.min(box.height, root.clientHeight - top),
      share: Number(root.style.getPropertyValue("--logo-flight-rise")),
    }
  })()`)) as { start: number; length: number; share: number }
  expect(share).toBeGreaterThan(0)

  // Halfway through the rise the tiles are still the hero's.
  await page.evaluate(`scrollTo(0, ${start + (share * length) / 2})`)
  await expect(heroTiles(page)).toHaveCSS("opacity", "1")
  await expect(headerLogo(page)).toHaveCSS("opacity", "0")

  // Past it, the header logo shows over them and flies on.
  await page.evaluate(`scrollTo(0, ${Math.ceil(start + share * length) + 2})`)
  await expect(heroTiles(page)).toHaveCSS("opacity", "0")
  await expect(headerLogo(page)).toHaveCSS("opacity", "1")
  const tiles = (await heroTiles(page).boundingBox())!
  const logo = (await headerLogo(page).boundingBox())!
  for (const key of ["x", "y", "width"] as const) {
    expect(Math.abs(logo[key] - tiles[key])).toBeLessThanOrEqual(4)
  }
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
