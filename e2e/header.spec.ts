import { expect, test, type Page } from "@playwright/test"

// Issue #115: the header stays in view (the only way to the menu); on the
// home page its controls rise in after the brand, transform and opacity only.
type Animated = {
  getAnimations(options: { subtree: true }): {
    effect: {
      getTiming(): { delay: number }
      getKeyframes(): Record<string, unknown>[]
    }
  }[]
}
const TIMING_KEYS = ["offset", "computedOffset", "easing", "composite"]

const headerAnimations = (page: Page) =>
  page.getByRole("banner").evaluate(
    (element, timingKeys) =>
      (element as unknown as Animated)
        .getAnimations({ subtree: true })
        .map(({ effect }) => ({
          delay: effect.getTiming().delay,
          properties: effect
            .getKeyframes()
            .flatMap((frame) => Object.keys(frame))
            .filter((key) => !timingKeys.includes(key)),
        })),
    TIMING_KEYS
  )

test("the header stays in view while the page scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 })
  await page.goto("/en/blog")
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded()
  const box = (await page.getByRole("banner").boundingBox())!
  expect(box.y).toBe(0)
  await expect(
    page.getByRole("banner").getByRole("button", { name: "Menu" })
  ).toBeInViewport()
})

test("on the home page the controls rise in one after another", async ({
  page,
}) => {
  await page.goto("/en")
  const animations = await headerAnimations(page)
  expect(animations.map(({ delay }) => Math.round(delay))).toEqual([
    600, 680, 760,
  ])
  for (const { properties } of animations) {
    expect(new Set(properties)).toEqual(new Set(["opacity", "transform"]))
  }
  // Clicks land while they move.
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click()
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible()
})

test("other pages show the header as is", async ({ page }) => {
  await page.goto("/en/projects")
  expect(await headerAnimations(page)).toEqual([])
})

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" })

  test("the home page header doesn't move", async ({ page }) => {
    await page.goto("/en")
    expect(await headerAnimations(page)).toEqual([])
  })
})

test("the Lang menu hangs from the header and marks the current Lang", async ({
  page,
}) => {
  await page.goto("/ru/projects")
  const trigger = page
    .getByRole("banner")
    .getByRole("button", { name: "Язык: RU" })
  await trigger.click()
  const menu = page.getByRole("menu")
  await expect(menu.getByRole("menuitem")).toHaveCount(6)
  await expect(menu.getByRole("menuitem", { name: "Русский" })).toHaveAttribute(
    "aria-current",
    "page"
  )
  const header = (await page.getByRole("banner").boundingBox())!
  const box = (await menu.boundingBox())!
  expect(Math.round(box.y)).toBe(Math.round(header.y + header.height))
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
})
