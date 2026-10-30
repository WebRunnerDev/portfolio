import { expect, test } from "@playwright/test"

import { expectNoPageOverflow } from "./overflow"

// Issue #8: header, full-screen menu, footer, stub pages, 404.
const LANGS = ["en", "ru", "kk", "es", "de", "ar"]
const PAGES = ["", "/cv", "/projects", "/gallery", "/blog"]

test("menu works from the keyboard: trap, Esc, focus return", async ({
  page,
}) => {
  // Full screen, below `lg`, the menu is modal; the panel above it isn't.
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto("/en")
  const trigger = page.getByRole("banner").getByRole("button", { name: "Menu" })
  await expect(trigger).toBeEnabled()
  await trigger.focus()
  await page.keyboard.press("Enter")

  const menu = page.getByRole("dialog", { name: "Menu" })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole("button", { name: "Close menu" })).toBeFocused()

  // Tab cycles inside the dialog and never reaches the page behind it.
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab")
    await expect(menu.locator(":focus")).toHaveCount(1)
  }

  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
})

test("menu links navigate and close the menu", async ({ page }) => {
  await page.goto("/en")
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click()
  const menu = page.getByRole("dialog", { name: "Menu" })
  await menu.getByRole("link", { name: "Projects" }).click()

  await expect(page).toHaveURL(/\/en\/projects$/)
  await expect(menu).toBeHidden()
  await expect(
    page.getByRole("heading", { level: 1, name: "Projects" })
  ).toBeVisible()
  await expect(page.getByTestId("current-section")).toHaveText("Projects")

  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click()
  await expect(menu.getByRole("link", { name: "Projects" })).toHaveAttribute(
    "aria-current",
    "page"
  )
})

test("logo links to the home page", async ({ page }) => {
  await page.goto("/ru/cv")
  await expect(
    page.getByRole("heading", { level: 1, name: "Резюме" })
  ).toBeVisible()
  await page.getByRole("link", { name: /^WebRunner/ }).click()
  await expect(page).toHaveURL(/\/ru$/)
  await expect(page.getByTestId("current-section")).toHaveCount(0)
})

test("skip link moves focus to the content", async ({ page }) => {
  await page.goto("/en/blog")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await page.keyboard.press("Tab")
  const skip = page.getByRole("link", { name: "Skip to content" })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.locator("main")).toBeFocused()
})

test("unknown path renders 404 inside the layout", async ({ page }) => {
  await page.goto("/de/nope")
  await expect(
    page.getByRole("heading", { level: 1, name: "Seite nicht gefunden" })
  ).toBeVisible()
  await expect(page.getByRole("banner")).toBeVisible()
  await expect(page.getByRole("contentinfo")).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex"
  )
  await page.getByRole("link", { name: "Zur Startseite" }).click()
  await expect(page).toHaveURL(/\/de$/)
})

test.describe("at 360px", () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test("no page scrolls horizontally in any Lang", async ({ page }) => {
    for (const lang of LANGS) {
      for (const path of [...PAGES, "/nope"]) {
        await page.goto(`/${lang}${path}`)
        await expect(page.getByRole("banner")).toBeVisible()
        await expectNoPageOverflow(page, `/${lang}${path}`)
      }
    }
  })

  test("the menu holds the Lang and mode controls", async ({ page }) => {
    await page.goto("/kk/blog")
    const banner = page.getByRole("banner")
    await expect(banner.getByRole("button", { name: "Қараңғы" })).toBeHidden()
    await banner.getByRole("button", { name: "Мәзір" }).click()

    const menu = page.getByRole("dialog", { name: "Мәзір" })
    await expect(menu.getByRole("button", { name: "Қараңғы" })).toBeVisible()
    await menu.getByRole("link", { name: "Deutsch" }).click()
    await expect(page).toHaveURL(/\/de\/blog$/)
    await expectNoPageOverflow(page)
  })
})
