import { expect, test, type Locator, type Page } from "@playwright/test"

// ADR-0007: the header and menu mirror in RTL; the logo and code don't.
async function header(page: Page) {
  const banner = page.getByRole("banner")
  const logo = banner.getByRole("img", { name: "WebRunner" })
  const menu = banner.getByRole("button", { name: /menu/i })
  await expect(menu).toBeEnabled()
  const logoBox = (await logo.boundingBox())!
  const menuBox = (await menu.boundingBox())!
  return { logo, menu, logoBox, menuBox }
}

async function openMenu(page: Page, trigger: Locator) {
  await trigger.click()
  const content = page.getByRole("menu")
  // Measure after the zoom-in animation, not mid-scale.
  await content.evaluate((el) =>
    Promise.all(
      el.getAnimations().map((a: { finished: Promise<unknown> }) => a.finished)
    )
  )
  return { content, contentBox: (await content.boundingBox())! }
}

test("/ar/ mirrors the header and menu but not the logo", async ({ page }) => {
  await page.goto("/ar")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")

  const { logo, menu, logoBox, menuBox } = await header(page)
  expect(logoBox.x).toBeGreaterThan(menuBox.x)
  // The lockup keeps its LTR order: logo, then the name.
  const brand = page.getByTestId("brand")
  await expect(brand).toHaveCSS("direction", "ltr")
  const nameBox = (await brand.locator("span").boundingBox())!
  expect(logoBox.x).toBeLessThan(nameBox.x)
  await expect(logo).toHaveCSS("transform", "none")

  const { content, contentBox } = await openMenu(page, menu)
  await expect(content).toHaveAttribute("dir", "rtl")
  await expect(content).toHaveCSS("direction", "rtl")
  // align="end" is the inline end: the left edge in RTL.
  expect(Math.abs(contentBox.x - menuBox.x)).toBeLessThan(1)

  const item = content.getByRole("menuitem", { name: "Design system" })
  await expect(item.locator("svg")).toHaveCSS("rotate", "180deg")
})

test("/en/ keeps the LTR header", async ({ page }) => {
  await page.goto("/en")
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr")

  const { menu, logoBox, menuBox } = await header(page)
  expect(logoBox.x).toBeLessThan(menuBox.x)

  const { content, contentBox } = await openMenu(page, menu)
  await expect(content).toHaveCSS("direction", "ltr")
  const right = (box: { x: number; width: number }) => box.x + box.width
  expect(Math.abs(right(contentBox) - right(menuBox))).toBeLessThan(1)
  const item = content.getByRole("menuitem", { name: "Design system" })
  await expect(item.locator("svg")).not.toHaveCSS("rotate", "180deg")
})

test("code blocks stay LTR on /ar/", async ({ page }) => {
  await page.goto("/ar/design")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(page.locator("pre").first()).toHaveCSS("direction", "ltr")
})
