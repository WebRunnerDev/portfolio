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

test("content shows even if Motion's features never load", async ({ page }) => {
  await page.route(/\/assets\/features-[\w-]+\.js$/, (route) => route.abort())
  await page.goto("/en/design")
  await revealed(page).scrollIntoViewIfNeeded()
  await expect(revealed(page)).toHaveCSS("opacity", "1")
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
