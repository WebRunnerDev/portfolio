import { expect, test, type Page } from "@playwright/test"

// ADR-0012: the full layer loads only at the `full` Motion Tier and after the
// visitor's first input, never with the page or in its modulepreloads.
const FULL_CHUNK = /hero-full/
const hero = (page: Page) => page.locator("section[data-tier]")

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
  await expect(hero(page).locator("[data-effect]")).toHaveAttribute(
    "data-effect",
    "full"
  )
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
