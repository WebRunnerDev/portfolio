import { expect, test, type Page } from "@playwright/test"

// The home page's hero (docs/design-brief.md › Hero, ADR-0006).
const hero = (page: Page) => page.locator("section[data-tier]")
const effect = (page: Page) => hero(page).locator("[data-effect]")

// The device hints tier detection reads: 2 cores make `lite`, 8 a `full`
// candidate (the FPS probe still has to pass).
async function cores(page: Page, count: number) {
  await page.addInitScript((count) => {
    Object.defineProperty(navigator, "hardwareConcurrency", {
      get: () => count,
    })
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 })
  }, count)
}

// Errors the page logs, except failed requests: without D1 (CI) the API
// answers 500, which says nothing about the effect.
function consoleErrors(page: Page) {
  const errors: string[] = []
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource")
    ) {
      errors.push(message.text())
    }
  })
  return errors
}

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
  await cores(page, 2)
  await page.goto("/en")
  await expect(hero(page)).toHaveAttribute("data-tier", "lite")
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

test("the full tier draws the Kinetic Grid and pauses off screen", async ({
  page,
}) => {
  const errors = consoleErrors(page)
  await cores(page, 8)
  await page.goto("/en")
  // `lite` while the FPS probe runs, then the grid.
  await expect(hero(page)).toHaveAttribute("data-tier", "full", {
    timeout: 10_000,
  })
  const canvas = effect(page)
  await expect(canvas).toHaveAttribute("data-effect", "full")
  await expect(canvas).toHaveAttribute("data-playing", "true")
  // Drawn at DPR 1 over the whole hero, and not blank.
  const box = (await hero(page).boundingBox())!
  await expect(canvas).toHaveJSProperty("width", Math.round(box.width))
  const drawn = await page.evaluate(`(() => {
    const canvas = document.querySelector("[data-effect=full]")
    const { data } = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height)
    return data.some((value, i) => i % 4 === 3 && value > 0)
  })()`)
  expect(drawn).toBe(true)

  await page.addStyleTag({ content: "main { padding-bottom: 200vh }" })
  await page.mouse.wheel(0, 3000)
  await expect(canvas).toHaveAttribute("data-playing", "false")
  expect(errors).toEqual([])
})

test("the full tier falls back to lite when the canvas is lost", async ({
  page,
}) => {
  const errors = consoleErrors(page)
  await cores(page, 8)
  await page.goto("/en")
  await expect(effect(page)).toHaveAttribute("data-effect", "full", {
    timeout: 10_000,
  })
  await effect(page).dispatchEvent("contextlost")
  await expect(hero(page)).toHaveAttribute("data-tier", "lite")
  await expect(effect(page)).toHaveAttribute("data-effect", "lite")
  expect(errors).toEqual([])
})

test("the full tier falls back to lite when the frame rate drops", async ({
  page,
}) => {
  await cores(page, 8)
  await page.goto("/en")
  await expect(effect(page)).toHaveAttribute("data-effect", "full", {
    timeout: 10_000,
  })
  // A device that can't keep up: 20 frames a second from now on.
  await page.evaluate(`window.requestAnimationFrame = (tick) =>
    setTimeout(() => tick(performance.now()), 50)`)
  await expect(hero(page)).toHaveAttribute("data-tier", "lite", {
    timeout: 10_000,
  })
  await expect(effect(page)).toHaveAttribute("data-effect", "lite")
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
  // `lite`: its logo sits at one side, so a mirror would show.
  await cores(page, 2)
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
