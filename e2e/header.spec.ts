import { expect, test, type Page } from "@playwright/test"

import {
  expectTakeOff,
  headerLogo,
  heroTiles,
  scrollPastHero,
} from "./logo-flight"

// Issue #115: the header stays in view (the only way to the menu); on the
// home page its controls rise in after the brand, transform and opacity only.
type Animated = {
  ownerDocument: { timeline: unknown }
  getAnimations(options: { subtree: true }): {
    timeline: unknown
    effect: {
      getTiming(): { delay: number }
      getKeyframes(): Record<string, unknown>[]
    }
  }[]
}
const TIMING_KEYS = ["offset", "computedOffset", "easing", "composite"]

// On the document's timeline: the logo flight runs on the hero's scroll.
const headerAnimations = (page: Page) =>
  page.getByRole("banner").evaluate(
    (element, timingKeys) =>
      (element as unknown as Animated)
        .getAnimations({ subtree: true })
        .filter(
          ({ timeline }) =>
            timeline === (element as unknown as Animated).ownerDocument.timeline
        )
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
  await expect(headerLogo(page)).toHaveCSS("opacity", "1")
  expect(
    await headerLogo(page).evaluate((logo) => logo.getAnimations().length)
  ).toBe(0)
})

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" })

  test("the home page header doesn't move", async ({ page }) => {
    await page.goto("/en")
    expect(await headerAnimations(page)).toEqual([])
  })

  test("the logo tiles stand in the header at once", async ({ page }) => {
    await page.goto("/en")
    await expect(headerLogo(page)).toHaveCSS("opacity", "1")
    await expect(headerLogo(page)).toHaveCSS("transform", "none")
  })
})

// Issue #158, DESIGN.md › Tile: on the home page the hero's logo tiles fly
// into the header logo as the hero scrolls away.
test("the home page header logo fills once the hero has gone", async ({
  page,
}) => {
  await page.goto("/en")
  await expect(heroTiles(page)).toHaveCSS("opacity", "1")
  await expect(headerLogo(page)).toHaveCSS("opacity", "0")
  // The slot keeps its place: the name doesn't move when the tiles land.
  const name = page
    .getByRole("banner")
    .getByTestId("brand")
    .locator(":scope > span")
    .last()
  const before = (await name.boundingBox())!
  // The hero's brand says the name: the header's waits under its mask.
  await expect(name.locator("span")).toHaveCSS("opacity", "0")

  await scrollPastHero(page)
  await expect(headerLogo(page)).toHaveCSS("opacity", "1")
  await expect(headerLogo(page)).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)"
  )
  await expect(heroTiles(page)).toHaveCSS("opacity", "0")
  expect(await name.boundingBox()).toEqual(before)
  await expect(name.locator("span")).toHaveCSS("opacity", "1")
  await expect(name.locator("span")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)"
  )

  // And back into the hero.
  await page.evaluate("scrollTo(0, 0)")
  await expect(headerLogo(page)).toHaveCSS("opacity", "0")
  await expect(heroTiles(page)).toHaveCSS("opacity", "1")
})

// The logo never stops over the name: the name comes out from under it only
// as it lands, and a keyboard focus on the home link shows it at once.
test("the header's name waits for the logo to land", async ({ page }) => {
  await page.goto("/en")
  await expect(heroTiles(page)).toHaveCSS("opacity", "1")
  const name = page
    .getByRole("banner")
    .getByTestId("brand")
    .locator(":scope > span")
    .last()
    .locator("span")
  // Halfway through the hero's exit the logo is over the header's start.
  await page.evaluate(`
    document.body.style.paddingBottom = "200vh"
    scrollTo(0, document.querySelector("section[data-tier]").getBoundingClientRect().height / 2)
  `)
  await expect(headerLogo(page)).toHaveCSS("opacity", "1")
  await expect(name).toHaveCSS("opacity", "0")

  const home = page
    .getByRole("banner")
    .getByRole("link", { name: "WebRunner, Home" })
  for (
    let i = 0;
    i < 3 && !(await home.evaluate((a) => a.matches(":focus")));
    i++
  ) {
    await page.keyboard.press("Tab")
  }
  await expect(home).toBeFocused()
  await expect(name).toHaveCSS("opacity", "1")
  await expect(name).toHaveCSS("transform", "none")
})

test("the header logo takes off from over the hero's tiles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto("/en")
  await expectTakeOff(page)
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
  // Sub-pixel layout: within a pixel of the header's bottom edge.
  expect(Math.abs(box.y - (header.y + header.height))).toBeLessThanOrEqual(1)
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
})
