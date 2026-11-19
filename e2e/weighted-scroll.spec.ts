import { devices, expect, test, type Page } from "@playwright/test"

// ADR-0014: the weighted scroll (Lenis) on the `full` Motion Tier with a
// fine pointer; the browser's own scroll everywhere else. Lenis scrolls the
// window itself, so Back, a reload, anchors, keys and overlays behave as
// without it. The design page is long and needs no data.
const PAGE = "/en/design"
const LENIS_CHUNK = /\/lenis-[\w-]+\.js$/
const WEIGHTED = "data-weighted-scroll"
// The FPS probe's run (MotionTierProvider): past it, the first input opens
// `full` at once.
const PAST_PROBE_MS = 2_500

const html = (page: Page) => page.locator("html")
const scrollY = (page: Page) => page.evaluate<number>("window.scrollY")

// The URLs of Lenis's chunk the page asked for.
function lenisRequests(page: Page) {
  const urls: string[] = []
  page.on("request", (request) => {
    if (LENIS_CHUNK.test(request.url())) urls.push(request.url())
  })
  return urls
}

// 16 cores and 8 GB: `full` past the probe.
async function strongDevice(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 16 })
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 })
  })
}

// Opens `path` on `full`: past the probe, then the first input.
async function weighted(page: Page, path = PAGE) {
  await strongDevice(page)
  await page.goto(path)
  await page.waitForTimeout(PAST_PROBE_MS)
  await page.mouse.move(200, 200)
  await expect(html(page)).toHaveAttribute(WEIGHTED, "", { timeout: 10_000 })
}

// Resolves once the window has held still for 20 frames.
const settled = (page: Page) =>
  page.evaluate<number>(`
    new Promise((resolve) => {
      let last = -1
      let still = 0
      const frame = () => {
        still = window.scrollY === last ? still + 1 : 0
        last = window.scrollY
        if (still >= 20) resolve(last)
        else requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
  `)

// Every frame's scroll from now on, in `window.positions`.
const recordScroll = (page: Page) =>
  page.evaluate(`
    window.positions = []
    ;(function frame() {
      window.positions.push(window.scrollY)
      requestAnimationFrame(frame)
    })()
  `)

test("the wheel glides on full with a fine pointer, only after the input", async ({
  page,
}) => {
  const requests = lenisRequests(page)
  await strongDevice(page)
  await page.goto(PAGE)
  await page.waitForTimeout(PAST_PROBE_MS)
  // `lite` until the input gate: no Lenis with the page.
  expect(requests).toEqual([])
  await expect(html(page)).not.toHaveAttribute(WEIGHTED)

  await page.mouse.move(200, 200)
  await expect(html(page)).toHaveAttribute(WEIGHTED, "", { timeout: 10_000 })
  expect(requests).toHaveLength(1)

  await recordScroll(page)
  await page.mouse.wheel(0, 600)
  expect(await settled(page)).toBe(600)
  const positions = (await page.evaluate("window.positions")) as number[]
  // Many frames on the way, not one jump.
  const between = new Set(positions.filter((y) => y > 0 && y < 600))
  expect(between.size).toBeGreaterThan(10)
})

test("the chunk is in no modulepreload", async ({ request }) => {
  const html = await (await request.get(PAGE)).text()
  expect(html).toContain('rel="modulepreload"')
  expect(html).not.toMatch(/lenis-[\w-]+\.js/)
})

test.describe("on a touch screen", () => {
  const { viewport, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"]
  test.use({ viewport, deviceScaleFactor, isMobile, hasTouch })

  test("the browser scrolls, Lenis never loads", async ({ page }) => {
    const requests = lenisRequests(page)
    await strongDevice(page)
    await page.goto(PAGE)
    await page.waitForTimeout(PAST_PROBE_MS)
    await page.touchscreen.tap(200, 400)
    await page.waitForTimeout(1_500)
    expect(requests).toEqual([])
    await expect(html(page)).not.toHaveAttribute(WEIGHTED)
  })
})

test("reduced motion never loads Lenis", async ({ page }) => {
  const requests = lenisRequests(page)
  await strongDevice(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(PAGE)
  await page.waitForTimeout(PAST_PROBE_MS)
  await page.mouse.move(200, 200)
  await page.mouse.wheel(0, 300)
  await page.waitForTimeout(1_500)
  expect(requests).toEqual([])
  await expect(html(page)).not.toHaveAttribute(WEIGHTED)
})

test("lite never loads Lenis", async ({ page }) => {
  const requests = lenisRequests(page)
  // A slow device: about 25 frames a second, under the probe's 40.
  await page.addInitScript(`
    const next = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) =>
      next(() => setTimeout(() => callback(performance.now()), 30))
  `)
  await page.goto("/en")
  await page.waitForTimeout(PAST_PROBE_MS)
  await page.mouse.move(200, 200)
  await page.waitForTimeout(1_500)
  await expect(page.locator("section[data-tier]")).toHaveAttribute(
    "data-tier",
    "lite"
  )
  expect(requests).toEqual([])
  await expect(html(page)).not.toHaveAttribute(WEIGHTED)
})

test("a key or a jump in the middle of a glide wins", async ({ page }) => {
  await weighted(page)
  // Home, from the keyboard, while the wheel's glide still runs.
  await page.mouse.wheel(0, 3000)
  await expect.poll(() => scrollY(page)).toBeGreaterThan(100)
  await page.keyboard.press("Home")
  expect(await settled(page)).toBe(0)

  // A jump Lenis didn't make (find in page scrolls to its match like this):
  // the window stays on it.
  await page.mouse.wheel(0, 3000)
  await expect.poll(() => scrollY(page)).toBeGreaterThan(100)
  const target = await page.evaluate<number>(`
    [...document.querySelectorAll("main h2")].at(-1).scrollIntoView({ block: "start" })
    window.scrollY
  `)
  expect(target).toBeGreaterThan(3000)
  expect(await settled(page)).toBe(target)

  // Page Up scrolls natively from there.
  await page.keyboard.press("PageUp")
  expect(await settled(page)).toBeLessThan(target)
})

test("Back to top jumps and moves the focus", async ({ page }) => {
  await weighted(page)
  await page.mouse.wheel(0, 20_000)
  expect(await settled(page)).toBeGreaterThan(3000)
  const top = page.getByRole("contentinfo").getByRole("link", {
    name: "Back to top",
  })
  await top.click()
  await expect(page.locator("main")).toBeFocused()
  expect(await settled(page)).toBe(0)
})

test("Back, Forward and a reload land where the page was", async ({ page }) => {
  await weighted(page)
  await page.mouse.wheel(0, 2000)
  const left = await settled(page)
  expect(left).toBe(2000)

  // The header's logo: to the home page, which opens at its top. Clicked
  // where it is: Playwright's own scroll into view would move the page.
  const logo = await page
    .getByRole("banner")
    .getByRole("link", { name: /^WebRunner/ })
    .boundingBox()
  await page.mouse.click(logo!.x + logo!.width / 2, logo!.y + logo!.height / 2)
  await expect(page).toHaveURL("/en")
  expect(await settled(page)).toBe(0)

  await page.goBack()
  await expect(page).toHaveURL(PAGE)
  expect(Math.abs((await settled(page)) - left)).toBeLessThan(2)
  // Lenis doesn't pull it anywhere afterwards.
  await page.waitForTimeout(1_000)
  expect(Math.abs((await scrollY(page)) - left)).toBeLessThan(2)
  // And it glides on from there.
  await page.mouse.wheel(0, 500)
  expect(Math.abs((await settled(page)) - left - 500)).toBeLessThan(2)

  await page.goForward()
  await expect(page).toHaveURL("/en")
  expect(await settled(page)).toBe(0)
  await page.goBack()
  await page.reload()
  await expect(page).toHaveURL(PAGE)
  expect(Math.abs((await settled(page)) - left - 500)).toBeLessThan(2)
})

// Issue #200: Back to a page whose content comes later. The router restores
// the scroll onto a short page, `settleScroll` puts it back as the page
// grows; Lenis must not pull it back to where it stood before.
test.describe("on the home page", () => {
  // The Swarm holds 40 fps in headless Chromium's software WebGL at this
  // size (e2e/full-layer.spec.ts), so `full` stays.
  test.use({ viewport: { width: 640, height: 480 } })

  const project = (id: number) => ({
    fallback: false,
    id,
    slug: `project-${id}`,
    title: `Project ${id}`,
    description: "What it does.",
    status: "completed",
    coverKey: null,
    githubUrl: null,
    demoUrl: null,
    featured: false,
    inCv: false,
    cvBullets: [],
    hasCaseStudy: true,
    technologies: [],
  })

  test("Back lands where the page was as its content arrives", async ({
    page,
  }) => {
    let delay = 0
    // Only Projects: the other sections aren't rendered.
    await page.route("**/api/public/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delay))
      const { pathname } = new URL(route.request().url())
      if (pathname.endsWith("/projects")) {
        return route.fulfill({
          json: Array.from({ length: 30 }, (_, i) => project(i + 1)),
        })
      }
      return route.fulfill({ status: 404, json: { error: "not_found" } })
    })
    await weighted(page, "/en")
    await expect(page.getByTestId("project-row")).toHaveCount(30)
    await page.mouse.move(320, 300)
    await page.mouse.wheel(0, 2400)
    const left = await settled(page)
    expect(left).toBe(2400)

    // A project in view, clicked where it is.
    const row = await page.evaluate<{ x: number; y: number }>(`
      (() => {
        const box = [...document.querySelectorAll("[data-testid=project-row]")]
          .map((element) => element.getBoundingClientRect())
          .find(({ top }) => top > 100 && top < 300)
        return { x: box.left + 20, y: box.top + 10 }
      })()
    `)
    await page.mouse.click(row.x, row.y)
    await expect(page).toHaveURL(/\/en\/projects\/project-\d+$/)

    // A reload drops the loaded data; a slow API keeps the home page short
    // when the router restores the scroll.
    await page.reload()
    await page.waitForTimeout(PAST_PROBE_MS)
    // The first move in a new document has no movement: it isn't input.
    await page.mouse.move(200, 200)
    await page.mouse.move(210, 210)
    await expect(html(page)).toHaveAttribute(WEIGHTED, "", { timeout: 10_000 })
    delay = 800
    await page.goBack()
    await expect(page).toHaveURL("/en")
    await expect(page.getByTestId("project-row")).toHaveCount(30)
    expect(Math.abs((await settled(page)) - left)).toBeLessThan(2)
    await page.waitForTimeout(1_000)
    expect(Math.abs((await scrollY(page)) - left)).toBeLessThan(2)
  })
})

test.describe("below lg", () => {
  test.use({ viewport: { width: 800, height: 900 } })

  test("an open menu holds the page under it", async ({ page }) => {
    await weighted(page)
    const trigger = page.getByRole("banner").getByRole("button", {
      name: "Menu",
    })
    await trigger.click()
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible()
    await expect(page.locator("body")).toHaveAttribute("data-scroll-locked")
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(500)
    expect(await scrollY(page)).toBe(0)

    await page.keyboard.press("Escape")
    // Once it has faded out: the wheel over the closing menu is its own.
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden()
    await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked")
    await page.mouse.wheel(0, 600)
    expect(await settled(page)).toBe(600)
  })
})
