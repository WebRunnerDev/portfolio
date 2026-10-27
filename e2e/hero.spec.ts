import { expect, test, type Page } from "@playwright/test"

// The home page's hero (docs/design-brief.md › Hero, ADR-0006).
const hero = (page: Page) => page.locator("section[data-tier]")
const effect = (page: Page) => hero(page).locator("[data-effect]")

async function mockProfile(page: Page) {
  await page.route("**/api/public/*/profile", (route) =>
    route.fulfill({
      json: {
        fallback: false,
        name: "Aibyn Serikov",
        headline: "Web developer",
        about: null,
        location: null,
        email: null,
        telegramUrl: null,
        linkedinUrl: null,
        githubUrl: null,
        photoKey: null,
      },
    })
  )
}

test("reduced motion gets the static tier, an image in place", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/en")
  await expect(hero(page)).toHaveAttribute("data-tier", "static")
  await expect(effect(page)).toHaveAttribute("data-effect", "static")
  // Only the image of the current theme loads.
  const image = effect(page).locator("img:visible")
  await expect(image).toHaveCount(1)
  await expect(image).toHaveAttribute("width", "2560")
  await expect(image).toHaveAttribute("height", "1440")
  await expect(image).toHaveJSProperty("naturalWidth", 2560)
  // Nothing moves: the brand's words and the logo tiles are in place.
  const parts = hero(page).locator(".hero-rise, .hero-gather")
  await expect(parts).toHaveCount(9)
  for (const part of await parts.all()) {
    await expect(part).toHaveCSS("transform", "none")
  }
})

test("the lite tier runs the logo tiles and pauses off screen", async ({
  page,
}) => {
  await page.goto("/en")
  // `full` shows `lite` until #117.
  await expect(hero(page)).toHaveAttribute("data-tier", /^(lite|full)$/)
  await expect(effect(page)).toHaveAttribute("data-effect", "lite")
  await expect(effect(page)).toHaveAttribute("data-playing", "true")
  await expect(effect(page).locator("img")).toHaveCount(0)

  // The page is too short to scroll the hero out of view: lengthen it.
  await page.addStyleTag({ content: "main { padding-bottom: 200vh }" })
  await page.mouse.wheel(0, 3000)
  await expect(effect(page)).toHaveAttribute("data-playing", "false")
  await expect(effect(page).locator(".hero-breathe").first()).toHaveCSS(
    "animation-play-state",
    "paused"
  )
})

test("the brand ends in place and is read as one word", async ({ page }) => {
  await page.goto("/en")
  const brand = page.getByRole("heading", { level: 1, name: "WebRunner" })
  await expect(brand).toBeVisible()
  for (const word of await brand.locator(".hero-rise").all()) {
    await expect(word).toHaveCSS("transform", "none")
  }
})

test("the subtitle shows the Profile, the actions lead to CV and projects", async ({
  page,
}) => {
  await mockProfile(page)
  await page.goto("/en")
  await expect(hero(page).getByText("Aibyn Serikov")).toBeVisible()
  await expect(hero(page).getByText("Web developer")).toBeVisible()
  await hero(page).getByRole("link", { name: "View CV" }).click()
  await expect(page).toHaveURL(/\/en\/cv$/)
  await page.goBack()
  await hero(page).getByRole("link", { name: "See projects" }).click()
  await expect(page).toHaveURL(/\/en\/projects$/)
})

test("no Profile: the hero shows without a subtitle and nothing shifts", async ({
  page,
}) => {
  await page.route("**/api/public/*/profile", (route) =>
    route.fulfill({ status: 404, json: { error: "not_found" } })
  )
  await page.goto("/en")
  await expect(hero(page).getByRole("link", { name: "View CV" })).toBeVisible()
  await expect(hero(page).locator("p").first()).toBeEmpty()
})

test("in RTL the effect and the brand don't mirror, the text does", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/en")
  const ltrEffect = (await effect(page).boundingBox())!
  const ltrBrand = page.getByRole("heading", { level: 1 })
  const ltrText = (await ltrBrand.locator("[dir=ltr]").boundingBox())!
  const ltrTiles = (await ltrBrand.locator("svg").boundingBox())!
  expect(ltrTiles.x).toBeGreaterThan(ltrText.x)

  await page.goto("/ar")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  const rtlEffect = (await effect(page).boundingBox())!
  expect(rtlEffect.x).toBeCloseTo(ltrEffect.x, 0)
  const brand = page.getByRole("heading", { level: 1 })
  await expect(brand.locator("[dir=ltr]")).toHaveCSS("direction", "ltr")
  // The tiles sit at the brand's end in the reading direction: its left.
  const text = (await brand.locator("[dir=ltr]").boundingBox())!
  const tiles = (await brand.locator("svg").boundingBox())!
  expect(tiles.x).toBeLessThan(text.x)
  // The actions start at the right.
  const cv = (await hero(page).getByRole("link").first().boundingBox())!
  const projects = (await hero(page).getByRole("link").nth(1).boundingBox())!
  expect(cv.x).toBeGreaterThan(projects.x)
})
