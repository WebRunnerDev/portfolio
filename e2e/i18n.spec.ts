import { expect, test } from "@playwright/test"

test("an unknown Lang redirects to EN on the same path", async ({ page }) => {
  await page.goto("/fr/design")
  await expect(page).toHaveURL(/\/en\/design$/)
})

test("/ follows Accept-Language", async ({ browser }) => {
  const context = await browser.newContext({ locale: "de-DE" })
  const page = await context.newPage()
  await page.goto("/")
  await expect(page).toHaveURL(/\/de$/)
  await context.close()
})

test("the switcher keeps the path and the cookie wins on /", async ({
  page,
}) => {
  await page.goto("/en/design")
  await page.getByRole("link", { name: "Қазақша" }).click()
  await expect(page).toHaveURL(/\/kk\/design$/)
  await expect(page.locator("html")).toHaveAttribute("lang", "kk")

  await page.goto("/")
  await expect(page).toHaveURL(/\/kk$/)
  await expect(
    page.getByRole("link", { name: "Түйіндемені ашу" })
  ).toBeVisible()
})

test("hreflang lists every Lang and x-default", async ({ page }) => {
  await page.goto("/ru/design")
  const alternates = page.locator('head link[rel="alternate"]')
  await expect(alternates).toHaveCount(7)
  await expect(page.locator('head link[hreflang="x-default"]')).toHaveAttribute(
    "href",
    /\/en\/design$/
  )
  await expect(page.locator('head link[hreflang="ar"]')).toHaveAttribute(
    "href",
    /\/ar\/design$/
  )
})
