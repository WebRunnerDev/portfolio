import { expect, test, type Page } from "@playwright/test"

// Issue #114: the menu's tiles spread from the header logo, its rows rise one
// after another; closing runs it backwards. Radix keeps the focus handling.
const trigger = (page: Page, name = "Menu") =>
  page.getByRole("banner").getByRole("button", { name })
const menu = (page: Page, name = "Menu") => page.getByRole("dialog", { name })

// What the menu's animations move, without the transitions of its controls
// (e2e has no DOM types).
type Animated = {
  getAnimations(options: { subtree: true }): {
    constructor: { name: string }
    effect: {
      getTiming(): { delay: number }
      getKeyframes(): Record<string, unknown>[]
    }
  }[]
}
type Clickable = {
  click(): void
  ownerDocument: {
    querySelector(selector: string): Animated
    defaultView: { requestAnimationFrame(callback: () => void): void }
  }
}
const TIMING_KEYS = ["offset", "computedOffset", "easing", "composite"]

// Opens the menu and lists its animations two frames later, before the
// short ones end. The menu loads when the pointer reaches its button (#142):
// the button Radix gives it says it opens a dialog.
const openAndList = async (page: Page) => {
  await trigger(page).hover()
  await expect(trigger(page)).toHaveAttribute("aria-haspopup", "dialog")
  return trigger(page).evaluate(async (element, timingKeys) => {
    const button = element as unknown as Clickable
    const frame = () =>
      new Promise<void>((resolve) =>
        button.ownerDocument.defaultView.requestAnimationFrame(resolve)
      )
    button.click()
    await frame()
    await frame()
    return button.ownerDocument
      .querySelector('[role="dialog"]')
      .getAnimations({ subtree: true })
      .filter((animation) => animation.constructor.name !== "CSSTransition")
      .map(({ effect }) => ({
        delay: effect.getTiming().delay,
        properties: effect
          .getKeyframes()
          .flatMap((frame) => Object.keys(frame))
          .filter((key) => !timingKeys.includes(key)),
      }))
  }, TIMING_KEYS)
}

const rows = (page: Page) =>
  menu(page).getByRole("navigation").getByRole("link")

test("opens and closes with the mouse, moving transform and opacity only", async ({
  page,
}) => {
  await page.goto("/en/cv")
  await expect(trigger(page)).toBeEnabled()
  const running = await openAndList(page)
  await expect(menu(page)).toBeVisible()
  expect(new Set(running.flatMap((a) => a.properties))).toEqual(
    new Set(["transform", "opacity"])
  )
  // The surface, the set of tiles and its seven tiles, the five links (the
  // controls row is in the header from `lg`): a choreography, not one move.
  expect(running).toHaveLength(14)
  expect(new Set(running.map((a) => a.delay)).size).toBeGreaterThan(3)

  // Every row ends in place.
  for (const link of await rows(page).all()) {
    const text = link.locator("span.block").first()
    await expect(text).toHaveCSS("opacity", "1")
    await expect(text).toHaveCSS("transform", "none")
  }

  // The panel leaves the header in view: its trigger closes it.
  await trigger(page, "Close menu").click()
  // Radix keeps the menu while it folds, then removes it.
  await expect(menu(page)).toBeHidden()
  await expect(trigger(page)).toBeFocused()
})

test("opens and closes from the keyboard", async ({ page }) => {
  await page.goto("/en")
  await expect(trigger(page)).toBeEnabled()
  await trigger(page).focus()
  await page.keyboard.press("Enter")

  // Radix focuses the panel itself (it skips links), Tab the first block.
  // Hover and focus look the same: its tile shows. The block's description
  // is read as such, not as its name.
  await expect(menu(page)).toBeFocused()
  await page.keyboard.press("Tab")
  const first = rows(page).first()
  await expect(first).toBeFocused()
  await expect(first).toHaveAccessibleName("Home")
  await expect(first).toHaveAccessibleDescription(/^Portfolio of WebRunner/)
  await expect(first.locator("span").first()).toHaveCSS("opacity", "1")

  await page.keyboard.press("Escape")
  await expect(menu(page)).toBeHidden()
  await expect(trigger(page)).toBeFocused()
})

test("a link works while the menu is still opening", async ({ page }) => {
  await page.goto("/en")
  await expect(trigger(page)).toBeEnabled()
  await trigger(page).click()
  await rows(page)
    .and(page.getByRole("link", { name: "Projects" }))
    .click()
  await expect(page).toHaveURL(/\/en\/projects$/)
  await expect(menu(page)).toBeHidden()
})

test("reduced motion opens and closes the menu at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/en/cv")
  await expect(trigger(page)).toBeEnabled()
  expect(await openAndList(page)).toEqual([])
  await expect(menu(page)).toBeVisible()
  for (const link of await rows(page).all()) {
    await expect(link.locator("span.block").first()).toHaveCSS("opacity", "1")
  }

  await page.keyboard.press("Escape")
  await expect(menu(page)).toBeHidden({ timeout: 100 })
  await expect(trigger(page)).toBeFocused()
})

test("on /ar/ the layout mirrors, the tiles don't", async ({ page }) => {
  await page.goto("/ar/cv")
  await expect(trigger(page, "القائمة")).toBeEnabled()
  await trigger(page, "القائمة").click()
  // The set of tiles, once it has spread.
  const tiles = menu(page, "القائمة").getByTestId("menu-tiles")
  await expect(tiles).toHaveCSS("transform", "none")
  await expect(tiles).toHaveCSS("direction", "rtl")
  // The spread tiles sit at the inline end: on the left in RTL.
  expect((await tiles.boundingBox())!.x).toBe(0)
  // The trigger turns into the close button: the inline end, on the left.
  const close = trigger(page, "إغلاق القائمة")
  expect((await close.boundingBox())!.x).toBeLessThan(200)
})

test("the panel hangs from the header and leaves the page in use", async ({
  page,
}) => {
  await page.goto("/en/cv")
  await expect(trigger(page)).toBeEnabled()
  await trigger(page).click()
  const header = (await page.getByRole("banner").boundingBox())!
  const panel = (await menu(page).boundingBox())!
  expect(panel.y).toBe(header.y + header.height)
  expect(panel.height).toBeLessThan(page.viewportSize()!.height / 2)
  // The tiles fold back into the header logo, not into the first block: the
  // panel's unseen bar stands right over the header.
  const brand = async (scope: ReturnType<typeof menu>) =>
    (await scope.getByTestId("brand").boundingBox())!
  expect(await brand(menu(page))).toEqual(await brand(page.getByRole("banner")))
  // The five blocks stand in one row, titles in line once they've risen.
  for (const link of await rows(page).all()) {
    await expect(link.locator("span.block").first()).toHaveCSS(
      "transform",
      "none"
    )
  }
  const tops = await Promise.all(
    (await rows(page).all()).map(
      async (link) =>
        (await link.locator("span.block").first().boundingBox())!.y
    )
  )
  expect(new Set(tops).size).toBe(1)

  // Non-modal: the page still scrolls, and a click on it closes the panel.
  await page.mouse.wheel(0, 400)
  await expect.poll(() => page.evaluate("window.scrollY")).toBeGreaterThan(0)
  await page.mouse.click(10, page.viewportSize()!.height - 10)
  await expect(menu(page)).toBeHidden()
})

test.describe("below lg", () => {
  test.use({ viewport: { width: 800, height: 900 } })

  test("the menu is full screen and the header doesn't move", async ({
    page,
  }) => {
    await page.goto("/en/cv")
    await expect(trigger(page)).toBeEnabled()
    const before = (await trigger(page).boundingBox())!
    await trigger(page).click()
    const box = (await menu(page).boundingBox())!
    expect(box.y).toBe(0)
    expect(box.height).toBe(900)
    // The close button of its bar ends where the trigger does, though the
    // page's scrollbar is gone under the menu.
    const close = menu(page).getByRole("button", { name: "Close menu" })
    await expect(close).toBeFocused()
    const closeBox = (await close.boundingBox())!
    expect(closeBox.x + closeBox.width).toBeCloseTo(before.x + before.width, 0)

    // The scrollbar keeps its place while the page is locked: nothing
    // shifts when it comes back.
    await close.click()
    await expect(menu(page)).toBeHidden()
    expect((await trigger(page).boundingBox())!.x).toBe(before.x)
  })
})
