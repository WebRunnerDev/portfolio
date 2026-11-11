import { expect, test, type Page } from "@playwright/test"

// The home page's hero (docs/design-brief.md › Hero, ADR-0006). When the
// full layer loads at all: e2e/full-layer.spec.ts.
const hero = (page: Page) => page.locator("section[data-tier]")
const effect = (page: Page) => hero(page).locator("[data-effect]")

// The device hints tier detection reads: 2 cores make `lite`, 8 a `full`
// candidate (the FPS probe and the input gate still have to pass).
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

// Headless Chromium draws WebGL in software (SwiftShader). At this size it
// holds the 40 fps the scene needs, so the FPS meter doesn't drop it to
// `lite` in the middle of a test.
const SOFTWARE_GL = { width: 640, height: 480 }

// Past the input gate (ADR-0012) and the crossfade: the scene alone.
async function fullScene(page: Page) {
  await page.mouse.move(200, 200)
  await expect(hero(page)).toHaveAttribute("data-tier", "full", {
    timeout: 10_000,
  })
  await expect(
    hero(page).locator("[data-effect=full][data-ready=true]")
  ).toBeAttached()
  await expect(effect(page)).toHaveCount(1)
  await expect(effect(page)).toHaveAttribute("data-effect", "full")
  return effect(page)
}

test("the full tier draws the Cast Lattice and pauses off screen", async ({
  page,
}) => {
  const errors = consoleErrors(page)
  await cores(page, 8)
  await page.setViewportSize(SOFTWARE_GL)
  await page.goto("/en")
  const canvas = await fullScene(page)
  await expect(canvas).toHaveAttribute("data-ready", "true")
  await expect(canvas).toHaveAttribute("data-playing", "true")
  await expect(canvas).toHaveCSS("opacity", "1")
  // At DPR 1 over the whole hero, and not blank: many colors in a row of
  // the frame, read in a frame after the scene drew it.
  const box = (await hero(page).boundingBox())!
  await expect(canvas).toHaveJSProperty("width", Math.round(box.width))
  const colors = await page.evaluate(`new Promise((resolve) =>
    requestAnimationFrame(() => {
      const canvas = document.querySelector("[data-effect=full]")
      const gl = canvas.getContext("webgl2")
      const row = new Uint8Array(canvas.width * 4)
      gl.readPixels(0, canvas.height >> 1, canvas.width, 1, gl.RGBA, gl.UNSIGNED_BYTE, row)
      const seen = new Set()
      for (let i = 0; i < row.length; i += 4) {
        seen.add((row[i] << 16) | (row[i + 1] << 8) | row[i + 2])
      }
      resolve(seen.size)
    })
  )`)
  expect(colors).toBeGreaterThan(3)

  await page.addStyleTag({ content: "main { padding-bottom: 200vh }" })
  await page.mouse.wheel(0, 3000)
  await expect(canvas).toHaveAttribute("data-playing", "false")
  expect(errors).toEqual([])
})

test("the full tier falls back to lite when the WebGL context is lost", async ({
  page,
}) => {
  const errors = consoleErrors(page)
  await cores(page, 8)
  await page.setViewportSize(SOFTWARE_GL)
  await page.goto("/en")
  await fullScene(page)
  await page.evaluate(`document
    .querySelector("[data-effect=full]")
    .getContext("webgl2")
    .getExtension("WEBGL_lose_context")
    .loseContext()`)
  await expect(hero(page)).toHaveAttribute("data-tier", "lite")
  await expect(effect(page)).toHaveAttribute("data-effect", "lite")
  expect(errors).toEqual([])
})

test("the full tier falls back to lite when the frame rate drops", async ({
  page,
}) => {
  await cores(page, 8)
  await page.setViewportSize(SOFTWARE_GL)
  await page.goto("/en")
  await fullScene(page)
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
