import { expect, test, type Page } from "@playwright/test"

// Issue #86: the Gallery page as a grid of Album cards, against an in-memory
// /api/public/* (the D1 behind `vite preview` is empty). On RU, Cats only has
// its EN Translation; Drafts has no photos yet.
const LANGS = ["en", "ru", "kk", "es", "de", "ar"]

function albums(lang: string) {
  const ru = lang === "ru"
  return [
    {
      fallback: false,
      id: 1,
      slug: "trips",
      title: ru ? "Поездки" : "Trips",
      cover: { key: "photos/trips.jpg", width: 1000, height: 750 },
      photoCount: 3,
    },
    {
      fallback: ru,
      id: 2,
      slug: "cats",
      title: "Cats",
      cover: { key: "photos/cats.jpg", width: 4000, height: 3000 },
      photoCount: 21,
    },
    {
      fallback: false,
      id: 3,
      slug: "drafts",
      title: ru ? "Черновики" : "Drafts",
      cover: null,
      photoCount: 0,
    },
  ]
}

async function mockPublicApi(page: Page, { empty = false } = {}) {
  // Cloudflare Images only runs on the zone.
  await page.route("**/cdn-cgi/image/**", (route) =>
    route.fulfill({ status: 404 })
  )
  await page.route("**/api/public/**", (route) => {
    const [, , , lang, entity, slug] = new URL(
      route.request().url()
    ).pathname.split("/")
    if (entity !== "albums" || slug) {
      return route.fulfill({ status: 404, json: { error: "not_found" } })
    }
    return route.fulfill({ json: empty ? [] : albums(lang) })
  })
}

const cards = (page: Page) => page.getByTestId("album-card")

test("cards on /en show the title and the photo count", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en/gallery")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gallery")
  await expect(cards(page)).toHaveCount(3)
  await expect(cards(page).nth(0)).toContainText("Trips")
  await expect(cards(page).nth(0)).toContainText("3 photos")
  await expect(cards(page).nth(2)).toContainText("0 photos")
  await expect(page.getByTestId("fallback-notice")).toHaveCount(0)
})

test("cards on /ru count in Russian and mark the Fallback", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/ru/gallery")
  await expect(cards(page).nth(0)).toContainText("3 фотографии")
  const cats = cards(page).nth(1)
  await expect(cats).toContainText("21 фотография")
  await expect(cats.locator('h2[lang="en"]')).toHaveText("Cats")
  await expect(cats.getByTestId("fallback-notice")).toBeVisible()
  await expect(page.getByTestId("fallback-notice")).toHaveCount(1)
})

test("covers have their size and a srcset, lazily after the first", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en/gallery")
  const first = cards(page).nth(0).locator("img")
  const second = cards(page).nth(1).locator("img")
  await expect(first).toHaveAttribute("width", "1000")
  await expect(first).toHaveAttribute("height", "750")
  // No candidate wider than the photo itself.
  const srcset = await first.getAttribute("srcset")
  expect(srcset).toContain(
    "/cdn-cgi/image/width=960,fit=scale-down,format=auto/media/photos/trips.jpg 960w"
  )
  expect(srcset).toMatch(/ 1000w$/)
  expect(srcset).not.toContain("1280w")
  await expect(first).toHaveAttribute("sizes", /384px/)
  await expect(first).toHaveAttribute("fetchpriority", "high")
  await expect(first).not.toHaveAttribute("loading", "lazy")
  await expect(second).toHaveAttribute("loading", "lazy")
  // No photos: the logo tiles, hidden from assistive technology.
  await expect(cards(page).nth(2).locator("img")).toHaveCount(0)
})

test("an empty list says what appears there", async ({ page }) => {
  await mockPublicApi(page, { empty: true })
  await page.goto("/en/gallery")
  await expect(page.getByTestId("gallery-empty")).toContainText("No albums yet")
  await expect(cards(page)).toHaveCount(0)
})

test("the list loads on every Lang", async ({ page }) => {
  await mockPublicApi(page)
  for (const lang of LANGS) {
    await page.goto(`/${lang}/gallery`)
    await expect(cards(page)).toHaveCount(3)
    await expect(page.locator("html")).toHaveAttribute("lang", lang)
  }
})

test("the grid mirrors on /ar and fits 360px", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 800 })
  await mockPublicApi(page)
  await page.goto("/ar/gallery")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")

  // Two columns: the first album sits on the right.
  const first = await cards(page).nth(0).boundingBox()
  const second = await cards(page).nth(1).boundingBox()
  expect(first!.x).toBeGreaterThan(second!.x)

  await page.setViewportSize({ width: 360, height: 800 })
  await expect(cards(page)).toHaveCount(3)
  const overflow = await page
    .locator("html")
    .evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBe(0)
})
