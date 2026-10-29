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
    const text = link.locator("span.block")
    await expect(text).toHaveCSS("opacity", "1")
    await expect(text).toHaveCSS("transform", "none")
  }

  await menu(page).getByRole("button", { name: "Close menu" }).click()
  // Radix keeps the menu while it folds, then removes it.
  await expect(menu(page)).toBeHidden()
  await expect(trigger(page)).toBeFocused()
})

test("opens and closes from the keyboard", async ({ page }) => {
  await page.goto("/en")
  await expect(trigger(page)).toBeEnabled()
  await trigger(page).focus()
  await page.keyboard.press("Enter")
  await expect(
    menu(page).getByRole("button", { name: "Close menu" })
  ).toBeFocused()

  // Hover and focus look the same: the tile at the start of the row shows.
  await page.keyboard.press("Tab")
  const first = rows(page).first()
  await expect(first).toBeFocused()
  await expect(first.locator("span").first()).toHaveCSS("opacity", "1")

  await page.keyboard.press("Escape")
  await expect(menu(page)).toBeHidden()
  await expect(trigger(page)).toBeFocused()
})

test("a link works while the menu is still opening", async ({ page }) => {
  await page.goto("/en")
  await expect(trigger(page)).toBeEnabled()
  await trigger(page).click()
  await rows(page).filter({ hasText: "Projects" }).click()
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
    await expect(link.locator("span.block")).toHaveCSS("opacity", "1")
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
  // The close button takes the trigger's place: the inline end, on the left.
  const close = menu(page, "القائمة").getByRole("button", {
    name: "إغلاق القائمة",
  })
  expect((await close.boundingBox())!.x).toBeLessThan(200)
})
