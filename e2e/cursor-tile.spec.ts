import { devices, expect, test, type Page } from "@playwright/test"

// Issue #168, docs/design-brief.md › Курсор-ромб: a small tile rides beside
// the native cursor and turns `primary` over a link or a button; a mouse or
// a pen only, never with reduced motion.
const tile = (page: Page) => page.locator(".cursor-tile")
const OFFSET = 16

// Two frames: the tile is placed in one and shown in the next.
const frames = (page: Page) =>
  page.evaluate(
    "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
  )

// The first move opens the input gate (ADR-0012); the tile starts after it,
// once the layout is mounted, and shows on the move after that.
async function moveMouse(page: Page, x: number, y: number) {
  await expect(page.getByRole("banner")).toBeVisible()
  await page.mouse.move(x - 10, y - 10)
  await page.mouse.move(x, y)
}

async function showTile(page: Page, x: number, y: number) {
  await expect(async () => {
    await moveMouse(page, x, y)
    await expect(tile(page)).toHaveAttribute("data-shown", "", {
      timeout: 500,
    })
  }).toPass()
}

const corner = (page: Page) =>
  tile(page).evaluate((element) => {
    const { x, y } = element.getBoundingClientRect()
    return [Math.round(x), Math.round(y)]
  })

test("a tile follows the mouse beside the cursor", async ({ page }) => {
  await page.goto("/en/blog")
  await showTile(page, 200, 300)
  await page.mouse.move(240, 320)
  await expect(tile(page)).toHaveAttribute("aria-hidden", "true")
  // It catches up with the pointer, right and down of it.
  await expect.poll(() => corner(page)).toEqual([240 + OFFSET, 320 + OFFSET])
  // Only transform and opacity change.
  await expect(tile(page)).toHaveCSS(
    "transition-property",
    "opacity, transform"
  )
})

test("over a link or a button the tile turns primary", async ({ page }) => {
  await page.goto("/en/blog")
  await showTile(page, 200, 300)
  const menu = page.getByRole("banner").getByRole("button", { name: "Menu" })
  await menu.hover()
  await expect(tile(page)).toHaveAttribute("data-over", "")
  // `primary` (::after) over `outline`, a quarter turn on.
  await expect
    .poll(() =>
      page.evaluate(
        `(({ rotate, opacity }) => ({ rotate, opacity }))(getComputedStyle(document.querySelector(".cursor-tile"), "::after"))`
      )
    )
    .toEqual({ rotate: "135deg", opacity: "1" })
  await page.getByRole("heading", { level: 1 }).hover()
  await expect(tile(page)).not.toHaveAttribute("data-over")
})

test("the tile takes no clicks and no focus", async ({ page }) => {
  await page.goto("/en/blog")
  await showTile(page, 200, 300)
  const [x, y] = await corner(page)
  const under = await page.evaluate(
    `document.elementFromPoint(${x + 4}, ${y + 4})?.className ?? ""`
  )
  expect(under).not.toContain("cursor-tile")
  // A click on a button the tile rides by reaches it.
  const menu = page.getByRole("banner").getByRole("button", { name: "Menu" })
  await menu.click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(tile(page)).toHaveAttribute("data-shown", "")
  await page.keyboard.press("Tab")
  await expect(tile(page)).not.toBeFocused()
})

test("the tile hides when the pointer leaves the window", async ({ page }) => {
  await page.goto("/en/blog")
  await showTile(page, 200, 300)
  // What the browser sends as the pointer leaves the page: no relatedTarget.
  await page.evaluate(
    `document.body.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }))`
  )
  await expect(tile(page)).not.toHaveAttribute("data-shown")
  await expect(tile(page)).toHaveCSS("opacity", "0")
  await page.mouse.move(260, 300)
  await expect(tile(page)).toHaveAttribute("data-shown", "")
})

test("in ar and the dark theme the tile stays right of the cursor", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "dark" })
  const page = await context.newPage()
  await page.goto("/ar/blog")
  await expect(page.locator("html")).toHaveClass(/dark/)
  await showTile(page, 400, 300)
  await expect.poll(() => corner(page)).toEqual([400 + OFFSET, 300 + OFFSET])
  await context.close()
})

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" })

  test("there is no tile", async ({ page }) => {
    await page.goto("/en/blog")
    await moveMouse(page, 200, 300)
    await page.mouse.move(240, 320)
    await frames(page)
    await expect(tile(page)).toHaveCount(0)
  })
})

test.describe("on a touch screen", () => {
  const { viewport, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"]
  test.use({ viewport, deviceScaleFactor, isMobile, hasTouch })

  test("there is no tile", async ({ page }) => {
    await page.goto("/en/blog")
    expect(await page.evaluate(`matchMedia("(pointer: fine)").matches`)).toBe(
      false
    )
    await page.touchscreen.tap(200, 300)
    await moveMouse(page, 200, 300)
    await frames(page)
    await expect(tile(page)).toHaveCount(0)
  })
})
