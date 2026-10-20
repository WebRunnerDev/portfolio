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

test("pages carry their meta without JS", async ({ request }) => {
  const response = await request.get("/ru/cv")
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('<html lang="ru" dir="ltr"')
  expect(html).toContain("<title data-meta>Резюме · WebRunner</title>")
  expect(html).toContain('property="og:locale" content="ru_RU"')
  expect(html).toContain('hreflang="x-default"')
})

test("unknown path under a Lang is a 404 with the SPA", async ({ page }) => {
  const response = await page.goto("/ar/nope")
  expect(response?.status()).toBe(404)
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(page.getByRole("banner")).toBeVisible()
})

test("the title follows SPA navigation", async ({ page }) => {
  await page.goto("/en/cv")
  await expect(page).toHaveTitle("CV · WebRunner")
  await page.getByRole("button", { name: "Menu" }).click()
  await page.getByRole("link", { name: "Blog" }).click()
  await expect(page).toHaveTitle("Blog · WebRunner")
  await expect(page.locator("head [data-meta]")).toHaveCount(0)
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute(
    "href",
    /\/en\/blog$/
  )
})
