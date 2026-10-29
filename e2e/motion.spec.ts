import { expect, test, type Page } from "@playwright/test"

// The Reveal primitives on /design (DESIGN.md › Motion): they end visible in
// every case, and reduced motion skips them.
const revealed = (page: Page) =>
  page.getByRole("listitem").filter({ hasText: "stagger-item" })

test("a Reveal plays once it scrolls into view", async ({ page }) => {
  await page.goto("/en/design")
  await expect(revealed(page)).toHaveCSS("opacity", "0")
  await revealed(page).scrollIntoViewIfNeeded()
  await expect(revealed(page)).toHaveCSS("opacity", "1")
  await expect(revealed(page)).toHaveCSS("transform", "none")
})

test("the words of a RevealText end in place", async ({ page }) => {
  await page.goto("/en/design")
  await page
    .getByText("Heavy graphite that gains speed")
    .scrollIntoViewIfNeeded()
  const words = page
    .locator("[aria-hidden=true] span.inline-block > span.inline-block")
    .filter({ hasText: /^(Heavy|speed)$/ })
  await expect(words).toHaveCount(2)
  for (const word of await words.all()) {
    await expect(word).toHaveCSS("transform", "none")
  }
})

test("reduced motion shows everything at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/en/design")
  await expect(revealed(page)).toHaveCSS("opacity", "1")
  await expect(revealed(page)).toHaveCSS("transform", "none")
  // No split copy for screen readers: the text is plain.
  await expect(
    page.locator("p", { hasText: "Heavy graphite" }).locator("[aria-hidden]")
  ).toHaveCount(0)
})

test("the focus ring of a chamfered button follows the cut", async ({
  page,
}) => {
  await page.goto("/en/design")
  const button = page.getByRole("button", { name: "Download CV" }).first()
  await expect(button).toHaveCSS("content", "none", { pseudo: "before" })
  await button.focus()
  await expect(button).toHaveCSS("content", '""', { pseudo: "before" })
  await expect(button).toHaveCSS("outline-style", "none")
})

// The rhombus loader (DESIGN.md › Tile), shown on /design without its delay.
const loader = (page: Page) => page.getByTestId("loader").first()

// What the loader's running animations move (e2e has no DOM types).
type Animated = {
  getAnimations(options: { subtree: true }): {
    effect: {
      getTiming(): { delay: number }
      getKeyframes(): Record<string, unknown>[]
    }
  }[]
}
const TIMING_KEYS = ["offset", "computedOffset", "easing", "composite"]

const animations = (page: Page) =>
  loader(page).evaluate(
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

test("the loader lights its tiles one by one, through opacity only", async ({
  page,
}) => {
  await page.goto("/en/design")
  await expect(loader(page)).toHaveRole("status")
  await expect(loader(page).getByText("Loading…")).toHaveClass(/sr-only/)
  const running = await animations(page)
  expect(running).toHaveLength(7)
  expect(new Set(running.flatMap((a) => a.properties))).toEqual(
    new Set(["opacity"])
  )
  expect(new Set(running.map((a) => a.delay)).size).toBe(6)
})

test("reduced motion shows the loader still and labelled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/en/design")
  await expect(loader(page).getByText("Loading…")).toBeVisible()
  expect(await animations(page)).toEqual([])
  for (const tile of await loader(page).locator("path.loader-tile").all()) {
    await expect(tile).toHaveCSS("opacity", "1")
  }
})

test("a page waiting for its data shows the loader under its title", async ({
  page,
}) => {
  // The API never answers.
  await page.route("**/api/public/**", () => {})
  await page.goto("/en/projects")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects")
  await expect(page.getByRole("main").getByRole("status")).toBeVisible()
})
