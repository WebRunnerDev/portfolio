import { expect, test } from "@playwright/test"

test("root redirects to a Lang-prefixed home page", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/en$/)
  await expect(page.getByRole("heading", { name: "WebRunner" })).toBeVisible()
})
