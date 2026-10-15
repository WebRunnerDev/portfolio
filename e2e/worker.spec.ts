import { expect, test } from "@playwright/test"

test("deep link is served by the SPA fallback, not a 404", async ({ page }) => {
  const response = await page.goto("/en/design")
  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole("heading", { level: 1, name: "Design system" })
  ).toBeVisible()
})

test("/api/health returns 200", async ({ request }) => {
  const response = await request.get("/api/health")
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ status: "ok" })
})

test("unknown /api/* route is a JSON 404, not the SPA", async ({ request }) => {
  const response = await request.get("/api/nope")
  expect(response.status()).toBe(404)
  expect(await response.json()).toEqual({ error: "not_found" })
})
