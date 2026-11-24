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

test("a path without a Lang that is no page is a 404, then the Not Found page", async ({
  page,
}) => {
  const response = await page.goto("/nope")
  expect(response?.status()).toBe(404)
  await expect(page).toHaveURL(/\/en\/nope$/)
  await expect(page.getByRole("banner")).toBeVisible()
})

test("/cv redirects to the CV on the visitor's Lang", async ({ request }) => {
  const response = await request.get("/cv?from=card", {
    headers: { "Accept-Language": "kk" },
    maxRedirects: 0,
  })
  expect(response.status()).toBe(302)
  expect(response.headers()["location"]).toBe("/kk/cv?from=card")
})

test("robots.txt points at the sitemap and keeps training crawlers out", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text()
  expect(robots).toContain("Sitemap: https://webrunner.dev/sitemap.xml")
  expect(robots).toMatch(/User-agent: GPTBot[\s\S]*?Disallow: \/\n/)
  // AI search goes by `User-agent: *`.
  expect(robots).not.toMatch(/User-agent: (OAI-SearchBot|Claude-SearchBot)/)
  // Google renders the pages from the Public API with robots.txt applied.
  expect(robots).toMatch(
    /User-agent: \*\nDisallow: \/admin\nDisallow: \/api\/\nAllow: \/api\/public\/\n/
  )
})

test("the sitemap is XML from the Worker, not the SPA", async ({ request }) => {
  const response = await request.get("/sitemap.xml")
  // The e2e D1 has no tables: the Worker answers 503, never index.html.
  expect(response.headers()["content-type"] ?? "").not.toContain("text/html")
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
