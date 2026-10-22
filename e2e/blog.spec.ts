import { expect, test, type Page } from "@playwright/test"

// Issue #98: the Blog page as Post cards, newest first, filtered by Tag with
// `?tag=<slug>`. Against an in-memory /api/public/* (the D1 behind
// `vite preview` is empty). On RU, Edge caching only has its EN Translation.
const LANGS = ["en", "ru", "kk", "es", "de", "ar"]

const workers = { slug: "workers", name: "Workers" }

function posts(lang: string) {
  const ru = lang === "ru"
  return [
    {
      fallback: ru,
      id: 1,
      slug: "edge-caching",
      title: "Edge caching",
      excerpt: "What a Worker keeps and for how long.",
      readingMinutes: 5,
      coverKey: "image/edge.jpg",
      publishedAt: "2026-10-20T12:00:00.000Z",
      tags: [{ slug: "cloudflare", name: "Cloudflare" }, workers],
    },
    {
      fallback: false,
      id: 2,
      slug: "rtl-tests",
      title: ru ? "Тесты RTL" : "RTL tests",
      excerpt: ru ? "Зеркало в e2e." : "The mirror in e2e.",
      readingMinutes: 1,
      coverKey: null,
      publishedAt: "2026-09-03T12:00:00.000Z",
      tags: [{ slug: "testing", name: "Testing" }, workers],
    },
    {
      fallback: false,
      id: 3,
      slug: "notes",
      title: ru ? "Заметки" : "Notes",
      excerpt: "",
      readingMinutes: 12,
      coverKey: null,
      publishedAt: "2026-01-15T12:00:00.000Z",
      tags: [],
    },
  ]
}

async function mockPublicApi(page: Page, { empty = false } = {}) {
  // Cloudflare Images only runs on the zone.
  await page.route("**/cdn-cgi/image/**", (route) =>
    route.fulfill({ status: 404 })
  )
  await page.route("**/api/public/**", (route) => {
    const url = new URL(route.request().url())
    const [, , , lang, entity] = url.pathname.split("/")
    if (entity !== "posts") {
      return route.fulfill({ status: 404, json: { error: "not_found" } })
    }
    const tag = url.searchParams.get("tag")
    const list = empty ? [] : posts(lang)
    return route.fulfill({
      json: tag
        ? list.filter((post) => post.tags.some((t) => t.slug === tag))
        : list,
    })
  })
}

const cards = (page: Page) => page.getByTestId("post-card")

test("cards on /en show the date, reading time, excerpt and Tags", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en/blog")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Blog")
  await expect(cards(page)).toHaveCount(3)
  await expect(cards(page).locator("h2")).toHaveText([
    "Edge caching",
    "RTL tests",
    "Notes",
  ])
  const first = cards(page).nth(0)
  await expect(first.locator("time")).toHaveText("October 20, 2026")
  await expect(first.locator("time")).toHaveAttribute(
    "datetime",
    "2026-10-20T12:00:00.000Z"
  )
  await expect(first).toContainText("5 min read")
  await expect(first).toContainText("What a Worker keeps and for how long.")
  await expect(first.getByRole("link")).toHaveText(["Cloudflare", "Workers"])
  await expect(cards(page).nth(1)).toContainText("1 min read")
  await expect(page.getByTestId("fallback-notice")).toHaveCount(0)
  await expect(page.getByTestId("blog-filter")).toHaveCount(0)
})

test("covers have a srcset, and no box without one", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en/blog")
  const cover = cards(page).nth(0).locator("img")
  const srcset = await cover.getAttribute("srcset")
  expect(srcset).toContain(
    "/cdn-cgi/image/width=640,fit=scale-down,format=auto/media/image/edge.jpg 640w"
  )
  expect(srcset).toMatch(/ 1280w$/)
  await expect(cover).toHaveAttribute("sizes", /384px/)
  await expect(cover).toHaveAttribute("fetchpriority", "high")
  await expect(cover).toHaveAttribute("alt", "")
  await expect(cards(page).nth(1).locator("img")).toHaveCount(0)
})

test("cards on /ru speak Russian and mark the Fallback", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/ru/blog")
  const edge = cards(page).nth(0)
  await expect(edge.locator("time")).toHaveText("20 октября 2026 г.")
  await expect(edge).toContainText("5 мин чтения")
  await expect(edge.locator('h2[lang="en"]')).toHaveText("Edge caching")
  await expect(edge.locator('p[lang="en"]')).toHaveText(
    "What a Worker keeps and for how long."
  )
  await expect(edge.getByTestId("fallback-notice")).toBeVisible()
  await expect(page.getByTestId("fallback-notice")).toHaveCount(1)
  await expect(cards(page).nth(1).locator("[lang]")).toHaveCount(0)
})

test("a Tag filters the list and the filter resets", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en/blog")
  await cards(page).nth(0).getByRole("link", { name: "Workers" }).click()
  await expect(page).toHaveURL(/\/en\/blog\?tag=workers$/)
  await expect(cards(page)).toHaveCount(2)
  await expect(page.getByTestId("blog-filter")).toContainText(
    "Posts tagged “Workers”"
  )
  await expect(
    cards(page).nth(1).getByRole("link", { name: "Workers" })
  ).toHaveAttribute("aria-current", "page")
  await expect(
    cards(page).nth(1).getByRole("link", { name: "Testing" })
  ).not.toHaveAttribute("aria-current")
  await expect(
    page.getByRole("link", { name: "All posts" })
  ).not.toHaveAttribute("aria-current")

  await cards(page).nth(1).getByRole("link", { name: "Testing" }).click()
  await expect(page).toHaveURL(/\?tag=testing$/)
  await expect(cards(page)).toHaveCount(1)

  await page.getByRole("link", { name: "All posts" }).click()
  await expect(page).toHaveURL(/\/en\/blog$/)
  await expect(cards(page)).toHaveCount(3)
  await expect(page.getByTestId("blog-filter")).toHaveCount(0)

  await page.goBack()
  await expect(page).toHaveURL(/\?tag=testing$/)
  await expect(cards(page)).toHaveCount(1)
})

test("an unknown Tag is an empty list, not an error", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en/blog?tag=nope")
  const empty = page.getByTestId("blog-empty")
  await expect(empty).toContainText("No posts with this tag")
  await expect(empty).toContainText("“nope”")
  await expect(cards(page)).toHaveCount(0)
  await empty.getByRole("link", { name: "All posts" }).click()
  await expect(page).toHaveURL(/\/en\/blog$/)
  await expect(cards(page)).toHaveCount(3)
})

test("an empty blog says what appears there", async ({ page }) => {
  await mockPublicApi(page, { empty: true })
  await page.goto("/en/blog")
  await expect(page.getByTestId("blog-empty")).toContainText("No posts yet")
  await expect(page.getByRole("link", { name: "All posts" })).toHaveCount(0)
})

test("the list and the filter load on every Lang", async ({ page }) => {
  await mockPublicApi(page)
  for (const lang of LANGS) {
    await page.goto(`/${lang}/blog`)
    await expect(cards(page)).toHaveCount(3)
    await expect(page.locator("html")).toHaveAttribute("lang", lang)
    await page.goto(`/${lang}/blog?tag=workers`)
    await expect(cards(page)).toHaveCount(2)
    await expect(page.getByTestId("blog-filter")).toBeVisible()
  }
})

test("/ar keeps Western digits, mirrors the grid and fits 360px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 800 })
  await mockPublicApi(page)
  await page.goto("/ar/blog")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(cards(page).nth(0).locator("time")).toContainText("2026")
  await expect(cards(page).nth(0).locator("time")).not.toHaveText(/[٠-٩]/)

  // Two columns: the newest post sits on the right.
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
