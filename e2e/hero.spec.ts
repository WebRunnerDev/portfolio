import { expect, test, type Page } from "@playwright/test"

// The home page's hero (docs/design-brief.md › Hero, ADR-0006). When the
// full layer loads at all: e2e/full-layer.spec.ts.
const hero = (page: Page) => page.locator("section[data-tier]")
const effect = (page: Page) => hero(page).locator("[data-effect]")

// The device hints the Swarm's level reads (ADR-0013): 8 cores and 8 GB
// make a strong device. Any device is a `full` candidate (the FPS probe and
// the input gate still have to pass).
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
  // Only the image of the current theme loads: the Swarm at rest, the
  // landscape frame on a wide screen, the portrait one on a tall screen.
  const image = effect(page).locator("img:visible")
  await expect(image).toHaveCount(1)
  await expect(image).toHaveAttribute("src", /swarm-light-landscape/)
  await expect(image).toHaveJSProperty("naturalWidth", 1440)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() =>
      image.evaluate(
        (img) => (img as unknown as { currentSrc: string }).currentSrc
      )
    )
    .toMatch(/swarm-light-portrait/)
  await expect(image).toHaveJSProperty("naturalWidth", 585)
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
  // No input: the gate holds `full` back (ADR-0012).
  await page.goto("/en")
  await expect(hero(page)).toHaveAttribute("data-tier", "lite")
  await expect(effect(page)).toHaveAttribute("data-effect", "lite")
  await expect(effect(page)).toHaveAttribute("data-playing", "true")
  await expect(effect(page).locator("img")).toHaveCount(0)

  // The page is too short to scroll the hero out of view: lengthen it. A
  // scroll from script isn't an input.
  await page.addStyleTag({ content: "main { padding-bottom: 200vh }" })
  await page.evaluate("window.scrollBy(0, 3000)")
  await expect(effect(page)).toHaveAttribute("data-playing", "false")
  await expect(effect(page).locator(".hero-breathe").first()).toHaveCSS(
    "animation-play-state",
    "paused"
  )
})

// Headless Chromium draws WebGL in software (SwiftShader). At this size
// (`mobile`'s class: under 860 px) it holds the 40 fps the scene needs, so
// the FPS meter doesn't step it down in the middle of a test.
const SOFTWARE_GL = { width: 640, height: 480 }
// A level pinned for a test that runs past the FPS meter's first window:
// it holds there, whatever software WebGL draws (ADR-0013).
const PINNED = "/en?swarm=mobile-lite"

// The Swarm's canvas: the home page's, behind the whole page (ADR-0013).
const scene = (page: Page) => page.locator("[data-effect=full]")

// Past the input gate (ADR-0012) and the crossfade: the scene alone.
async function fullScene(page: Page) {
  await page.mouse.move(200, 200)
  await expect(hero(page)).toHaveAttribute("data-tier", "full", {
    timeout: 10_000,
  })
  await expect(scene(page)).toHaveAttribute("data-ready", "true")
  await expect(effect(page)).toHaveCount(0)
  return scene(page)
}

// How many colors a row of the canvas has through the middle of the hero's
// logo square, read in the next frame. A level capped below the display's
// rate (`mobile-lite`: 30 fps) skips every other frame, and a frame it
// skipped reads blank (no `preserveDrawingBuffer`): poll it.
const colorsThroughLogo = (page: Page) =>
  page.evaluate(`new Promise((resolve) =>
    requestAnimationFrame(() => {
      const canvas = document.querySelector("[data-effect=full]")
      const logo = document
        .querySelector("[data-swarm-anchor=hero]")
        .getBoundingClientRect()
      const scale = canvas.width / canvas.clientWidth
      const y = Math.round(
        (canvas.clientHeight - (logo.top + logo.height / 2)) * scale
      )
      const gl = canvas.getContext("webgl2")
      const row = new Uint8Array(canvas.width * 4)
      gl.readPixels(0, y, canvas.width, 1, gl.RGBA, gl.UNSIGNED_BYTE, row)
      const seen = new Set()
      for (let i = 0; i < row.length; i += 4) {
        seen.add((row[i] << 16) | (row[i + 1] << 8) | row[i + 2])
      }
      resolve(seen.size)
    })
  )`) as Promise<number>

// Software WebGL on a CI runner holds the scene's numbers only just, and
// the FPS meter steps it down, which is right for a device without a GPU.
// So the level is pinned: the intro runs to its end.
test("the full tier draws the Swarm behind the whole page", async ({
  page,
}) => {
  const errors = consoleErrors(page)
  await cores(page, 8)
  await page.setViewportSize(SOFTWARE_GL)
  await page.goto(PINNED)
  const canvas = await fullScene(page)
  await expect(canvas).toHaveAttribute("data-quality", "mobile-lite")
  // Over the whole viewport (but the scrollbar, as the hero) at DPR 1,
  // behind the page, drawing and not blank: dust in the logo's row.
  const box = (await hero(page).boundingBox())!
  const drawn = await page.evaluate(`(() => {
    const canvas = document.querySelector("[data-effect=full]")
    return {
      position: getComputedStyle(canvas).position,
      width: canvas.width,
      height: canvas.height,
      playing: canvas.dataset.playing,
    }
  })()`)
  expect(drawn).toEqual({
    position: "fixed",
    width: Math.round(box.width),
    height: SOFTWARE_GL.height,
    playing: "true",
  })
  // The readout counts the nodes the crawl lights in the hero's web, then
  // says they are all indexed; the dust has gathered into the logo's row.
  const readout = hero(page).locator("[data-swarm-readout]")
  await expect(readout).toHaveText(/^(Crawling|Indexed) · \d+ nodes$/)
  await expect(readout).toHaveAttribute("dir", "ltr")
  await expect(readout).toHaveText(/^Indexed · \d+ nodes$/, {
    timeout: 10_000,
  })
  // Past the gather (INTRO_MS after the first frame).
  await page.waitForTimeout(1_500)
  await expect(canvas).toHaveAttribute("data-quality", "mobile-lite")
  await expect.poll(() => colorsThroughLogo(page)).toBeGreaterThan(20)

  // A hidden tab pauses it.
  await page.evaluate(`
    Object.defineProperty(document, "visibilityState", { get: () => "hidden" })
    document.dispatchEvent(new Event("visibilitychange"))
  `)
  await expect(canvas).toHaveAttribute("data-playing", "false")
  expect(errors).toEqual([])
})

// On a phone the logo square sits under the actions; the hero's text keeps
// that band free however short the screen (index.css › hero-logo-band).
for (const viewport of [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
]) {
  test(`on a short phone (${viewport.width}×${viewport.height}) the logo square stays under the actions`, async ({
    page,
  }) => {
    await cores(page, 8)
    await page.setViewportSize(viewport)
    await page.goto(PINNED)
    await fullScene(page)
    const actions = (await hero(page)
      .locator("[data-swarm-text]")
      .last()
      .boundingBox())!
    const logo = (await page.locator("[data-swarm-anchor=hero]").boundingBox())!
    // `spacing-xl` (24 px) apart, give or take subpixels.
    expect(logo.y).toBeGreaterThan(actions.y + actions.height + 23.5)
  })
}

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
  await expect(scene(page)).toHaveCount(0)
  await expect(hero(page).locator("[data-swarm-readout]")).toHaveCount(0)
  expect(errors).toEqual([])
})

// ADR-0013 › Понижение на ходу: a level down first (fewer particles, a
// 30 fps cap on a phone), `lite` only when that doesn't hold either.
test("the full tier steps down when the frame rate drops, then falls back", async ({
  page,
}) => {
  await cores(page, 8)
  await page.setViewportSize(SOFTWARE_GL)
  await page.goto("/en")
  const canvas = await fullScene(page)
  // Each level the scene is at, in order.
  await page.evaluate(`
    window.levels = [document.querySelector("[data-effect=full]").dataset.quality]
    new MutationObserver(([record]) => {
      const level = record.target.dataset.quality
      if (record.target.isConnected && window.levels.at(-1) !== level)
        window.levels.push(level)
    }).observe(document.querySelector("[data-effect=full]"), {
      attributeFilter: ["data-quality"],
    })
  `)
  // A device that can't keep up: 20 frames a second from now on.
  await page.evaluate(`window.requestAnimationFrame = (tick) =>
    setTimeout(() => tick(performance.now()), 50)`)
  await expect(canvas).toHaveAttribute("data-quality", "mobile-lite", {
    timeout: 10_000,
  })
  await expect(hero(page)).toHaveAttribute("data-tier", "lite", {
    timeout: 15_000,
  })
  await expect(effect(page)).toHaveAttribute("data-effect", "lite")
  expect(await page.evaluate("window.levels")).toEqual([
    "mobile",
    "mobile-lite",
  ])
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
  // `lite` (no input): its logo sits at one side, so a mirror would show.
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

// ADR-0013 › Касание: on a phone a tap on the web, not on a link, sends
// packets from the node nearest it; a swipe scrolls and sends none. The
// scene counts the taps that sent packets on its canvas (`data-taps`).
test.describe("on a touch screen", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })

  test("a tap on the web sends packets, a swipe and a link don't", async ({
    page,
  }) => {
    const errors = consoleErrors(page)
    await cores(page, 8)
    await page.addInitScript(`
      window.durations = []
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.interactionId) window.durations.push(entry.duration)
        }
      }).observe({ type: "event", durationThreshold: 16, buffered: true })
    `)
    await page.goto(PINNED)
    // The first tap is the input gate: the scene isn't there yet.
    await page.touchscreen.tap(20, 300)
    await expect(hero(page)).toHaveAttribute("data-tier", "full", {
      timeout: 10_000,
    })
    const canvas = scene(page)
    await expect(canvas).toHaveAttribute("data-ready", "true")
    await expect(hero(page).locator("[data-swarm-readout]")).toHaveText(
      /^Indexed · \d+ nodes$/,
      { timeout: 10_000 }
    )
    await expect(canvas).not.toHaveAttribute("data-taps")

    // A phone's CPU: the tap still paints within INP's "good".
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
    await page.evaluate("window.durations.length = 0")
    // The logo's square: the blocks lie there, clear of the text. Taps
    // before the intro's end send nothing, so it taps until one does.
    const logo = (await hero(page)
      .locator("[data-swarm-anchor=hero]")
      .boundingBox())!
    const x = logo.x + logo.width / 2
    const y = logo.y + logo.height / 2
    await expect(async () => {
      await page.touchscreen.tap(x, y)
      await expect(canvas).toHaveAttribute("data-taps", /^\d+$/, {
        timeout: 1_000,
      })
    }).toPass({ timeout: 10_000 })
    const durations = (await page.evaluate("window.durations")) as number[]
    expect(durations.length).toBeGreaterThan(0)
    expect(Math.max(...durations)).toBeLessThan(200)
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 })
    const taps = await canvas.getAttribute("data-taps")

    // A swipe up from the same place scrolls the page and sends nothing.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    })
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - i * 30 }],
      })
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    })
    await expect.poll(() => page.evaluate("window.scrollY")).toBeGreaterThan(0)
    await page.waitForTimeout(300)
    await expect(canvas).toHaveAttribute("data-taps", taps!)

    // A tap on a link goes there and sends nothing on the way. Below it a
    // tap does send, so a node is in the link's reach: the link nearer the
    // logo, back at the top of the page. Not just below: Chromium takes a
    // tap a few pixels off a link for the link. The projects' data comes
    // late, so the home page runs frames after the tap on the link.
    await page.evaluate("window.scrollTo(0, 0)")
    await page.waitForTimeout(500)
    const link = hero(page).getByRole("link", { name: "See projects" })
    const box = (await link.boundingBox())!
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height + 40)
    await expect(canvas).toHaveAttribute("data-taps", String(Number(taps) + 1))
    await page.route("**/api/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000))
      await route.fallback()
    })
    await page.evaluate(`
      window.taps = []
      new MutationObserver(() =>
        window.taps.push(document.querySelector("[data-effect=full]").dataset.taps)
      ).observe(document.querySelector("[data-effect=full]"), {
        attributeFilter: ["data-taps"],
      })
    `)
    await link.tap()
    await expect(page).toHaveURL(/\/en\/projects$/)
    expect(await page.evaluate("window.taps")).toEqual([])
    expect(errors).toEqual([])
  })
})
