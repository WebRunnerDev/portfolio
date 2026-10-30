import { expect, test, type Page } from "@playwright/test"

// ADR-0007: the header and menu mirror in RTL; the logo and code don't.
// Below `lg`, where the menu is full screen with a bar of its own (the panel
// above it: e2e/menu.spec.ts).
test.use({ viewport: { width: 800, height: 900 } })

async function header(page: Page) {
  const banner = page.getByRole("banner")
  const logo = banner.getByRole("img", { name: "WebRunner" })
  const menu = banner.getByRole("button", { name: /menu|القائمة/i })
  await expect(menu).toBeEnabled()
  const logoBox = (await logo.boundingBox())!
  const menuBox = (await menu.boundingBox())!
  return { logo, menu, logoBox, menuBox }
}

test("/ar/ mirrors the header and menu but not the logo", async ({ page }) => {
  await page.goto("/ar/cv")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")

  const { logo, menu, logoBox, menuBox } = await header(page)
  expect(logoBox.x).toBeGreaterThan(menuBox.x)
  // The current section sits after the brand in reading order: to its left.
  const sectionBox = (await page.getByTestId("current-section").boundingBox())!
  expect(sectionBox.x).toBeLessThan(logoBox.x)
  // The lockup keeps its LTR order: logo, then the name.
  const brand = page.getByRole("banner").getByTestId("brand")
  await expect(brand).toHaveCSS("direction", "ltr")
  const nameBox = (await brand.locator("span").boundingBox())!
  expect(logoBox.x).toBeLessThan(nameBox.x)
  await expect(logo).toHaveCSS("transform", "none")

  await menu.click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toHaveCSS("direction", "rtl")
  // The close button takes the trigger's place: the inline end, on the left.
  const closeBox = (await dialog
    .getByRole("button", { name: "إغلاق القائمة" })
    .boundingBox())!
  expect(closeBox.x).toBeLessThan(200)
  // The active marker is an inline-start border: on the right in RTL.
  const active = dialog
    .getByRole("navigation")
    .first()
    .locator('a[aria-current="page"]')
  await expect(active).toHaveCSS("border-right-width", "2px")
  await expect(active).toHaveCSS("border-left-width", "0px")
})

test("/en/ keeps the LTR header", async ({ page }) => {
  await page.goto("/en")
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr")

  const { menu, logoBox, menuBox } = await header(page)
  expect(logoBox.x).toBeLessThan(menuBox.x)

  await menu.click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toHaveCSS("direction", "ltr")
  const active = dialog
    .getByRole("navigation")
    .first()
    .locator('a[aria-current="page"]')
  await expect(active).toHaveCSS("border-left-width", "2px")
})

test("code blocks stay LTR on /ar/", async ({ page }) => {
  await page.goto("/ar/design")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(page.locator("pre").first()).toHaveCSS("direction", "ltr")
})
