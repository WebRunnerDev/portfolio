import { expect, test, type Page } from "@playwright/test"

// Issue #86: the Gallery page as a grid of Album cards; #87: an Album's page
// with its photos as masonry. Against an in-memory /api/public/* (the D1
// behind `vite preview` is empty). On RU, Cats only has its EN Translation;
// Drafts has no photos yet.
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

// Trips' photos in D1's order: tall and wide ones, the second with a caption
// on EN only.
function photos(lang: string) {
  const sizes = [
    [600, 900],
    [1200, 800],
    [800, 800],
    [900, 1200],
    [1600, 900],
    [700, 1000],
  ]
  return sizes.map(([width, height], i) => ({
    fallback: i === 1 && lang !== "en",
    id: i + 1,
    key: `photos/trips-${i + 1}.jpg`,
    width,
    height,
    caption: i === 1 ? "Harbour at dawn" : null,
  }))
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
    const album = albums(lang).find((album) => album.slug === slug)
    if (entity !== "albums" || (slug && !album)) {
      return route.fulfill({ status: 404, json: { error: "not_found" } })
    }
    if (album) {
      const list = album.slug === "trips" ? photos(lang) : []
      return route.fulfill({
        json: { ...album, photoCount: list.length, photos: list },
      })
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

const photoItems = (page: Page) =>
  page.getByTestId("album-photos").locator("li")

test("a card opens its Album", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en/gallery")
  await cards(page).nth(0).click()
  await expect(page).toHaveURL(/\/en\/gallery\/trips$/)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Trips")
  await expect(page).toHaveTitle("Trips · WebRunner")
  await expect(page.getByText("6 photos")).toBeVisible()
  await page.getByRole("link", { name: "Gallery" }).last().click()
  await expect(page).toHaveURL(/\/en\/gallery$/)
})

test("photos keep their order, size and a srcset, lazily after the first row", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en/gallery/trips")
  const images = photoItems(page).locator("img")
  await expect(images).toHaveCount(6)
  await expect(images.nth(0)).toHaveAttribute("alt", "Photo 1 of 6")
  await expect(images.nth(1)).toHaveAttribute("alt", "Harbour at dawn")
  await expect(images.nth(5)).toHaveAttribute("alt", "Photo 6 of 6")

  const first = images.nth(0)
  await expect(first).toHaveAttribute("width", "600")
  await expect(first).toHaveAttribute("height", "900")
  await expect(first).toHaveAttribute("sizes", /280px/)
  const srcset = await first.getAttribute("srcset")
  expect(srcset).toContain(
    "/cdn-cgi/image/width=320,fit=scale-down,format=auto/media/photos/trips-1.jpg 320w"
  )
  expect(srcset).toMatch(/ 600w$/)
  await expect(first).toHaveAttribute("fetchpriority", "high")
  for (const i of [0, 1, 2, 3]) {
    await expect(images.nth(i)).not.toHaveAttribute("loading", "lazy")
    await expect(images.nth(i)).toHaveAttribute("decoding", "async")
  }
  await expect(images.nth(1)).not.toHaveAttribute("fetchpriority", "high")
  await expect(images.nth(4)).toHaveAttribute("loading", "lazy")
  await expect(images.nth(5)).toHaveAttribute("loading", "lazy")
})

test("masonry reads row by row and keeps each photo's aspect ratio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await mockPublicApi(page)
  // Cloudflare Images is mocked away: the boxes alone must hold their size.
  await page.goto("/en/gallery/trips")
  const images = photoItems(page).locator("img")
  await expect(images).toHaveCount(6)

  const boxes = await Promise.all(
    [0, 1, 2, 3, 4].map((i) => images.nth(i).boundingBox())
  )
  // Four columns: the first four photos side by side, in order.
  for (const i of [1, 2, 3]) {
    expect(boxes[i]!.x).toBeGreaterThan(boxes[i - 1]!.x)
    expect(Math.abs(boxes[i]!.y - boxes[0]!.y)).toBeLessThan(1)
  }
  // The fifth goes under the shortest column: the wide second photo's.
  expect(Math.abs(boxes[4]!.x - boxes[1]!.x)).toBeLessThan(1)
  expect(boxes[4]!.y).toBeGreaterThan(boxes[1]!.y + boxes[1]!.height)
  // Height from width/height, give or take the rounding to a grid row.
  for (const [i, [w, h]] of [
    [600, 900],
    [1200, 800],
    [800, 800],
    [900, 1200],
  ].entries()) {
    const box = boxes[i]!
    expect(Math.abs(box.height - (box.width * h) / w)).toBeLessThan(4)
  }
})

test("an Album on /ru marks the Fallback of its title and captions", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/ru/gallery/cats")
  await expect(page.locator('h1[lang="en"]')).toHaveText("Cats")
  await expect(page.getByTestId("fallback-notice")).toBeVisible()
  await expect(page.getByText("0 фотографий")).toBeVisible()
  await expect(page.getByTestId("album-photos")).toHaveCount(0)

  await page.goto("/ru/gallery/trips")
  await expect(page.locator("h1")).toHaveText("Поездки")
  const images = photoItems(page).locator("img")
  await expect(images.nth(0)).toHaveAttribute("alt", "Фото 1 из 6")
  await expect(images.nth(1)).toHaveAttribute("lang", "en")
  await expect(images.nth(0)).not.toHaveAttribute("lang")
})

test("an unknown Album is a 404", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en/gallery/nope")
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" })
  ).toBeVisible()
})

test("the masonry mirrors on /ar and fits 360px", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 800 })
  await mockPublicApi(page)
  await page.goto("/ar/gallery/trips")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  const images = photoItems(page).locator("img")
  const first = await images.nth(0).boundingBox()
  const second = await images.nth(1).boundingBox()
  expect(first!.x).toBeGreaterThan(second!.x)

  await page.setViewportSize({ width: 360, height: 800 })
  await expect(images).toHaveCount(6)
  const overflow = await page
    .locator("html")
    .evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBe(0)
})
