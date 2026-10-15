import { expect, test } from "@playwright/test"

test("root redirects to a Lang-prefixed home page", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/en$/)
  await expect(page.getByRole("heading", { name: "WebRunner" })).toBeVisible()
})

test("design showcase renders in LTR and RTL", async ({ page }) => {
  await page.goto("/en/design")
  await expect(
    page.getByRole("heading", { level: 1, name: "Design system" })
  ).toBeVisible()
  await expect(page.locator('[dir="ltr"][lang="en"]').first()).toBeVisible()

  await page.goto("/ar/design")
  await expect(page.locator('[dir="rtl"][lang="ar"]').first()).toBeVisible()
})
