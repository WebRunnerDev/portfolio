import { expect, test, type Page } from "@playwright/test"

import { markdownTree } from "../contracts/markdown/parse"

// Issues #98, #99 and #100: the Blog page as Post cards, newest first,
// filtered by Tag with `?tag=<slug>`, the page of a Post with its JSON-LD,
// and (#101) the link to the RSS feed of each Lang.
// Against an in-memory /api/public/* (the D1 behind `vite preview` is empty).
// On RU, Edge caching only has its EN Translation; on AR, its page too.
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

const BODY = [
  "# Keys",
  "",
  "A Worker keeps a response under its URL.",
  "",
  "```ts",
  "const hit = await caches.default.match(request)",
  "```",
].join("\n")

async function mockPublicApi(page: Page, { empty = false } = {}) {
  // Cloudflare Images only runs on the zone.
  await page.route("**/cdn-cgi/image/**", (route) =>
    route.fulfill({ status: 404 })
  )
  // The Worker sends the body rendered.
  const body = await markdownTree(BODY)
  await page.route("**/api/public/**", (route) => {
    const url = new URL(route.request().url())
    const [, , , lang, entity, slug] = url.pathname.split("/")
    if (entity !== "posts") {
      return route.fulfill({ status: 404, json: { error: "not_found" } })
    }
    const tag = url.searchParams.get("tag")
    const list = empty ? [] : posts(lang)
    if (slug) {
      // A draft is never in the list, so it answers 404 as the API does.
      const found = list.find((post) => post.slug === slug)
      if (!found) {
        return route.fulfill({ status: 404, json: { error: "not_found" } })
      }
      const fallback =
        found.fallback || (lang === "ar" && slug === "edge-caching")
      const langs = slug === "edge-caching" ? ["en", "kk", "es", "de"] : LANGS
      return route.fulfill({
        json: {
          ...found,
          fallback,
          body,
          updatedAt: "2026-10-21T08:00:00.000Z",
          langs,
        },
      })
    }
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
  await expect(first.getByRole("link")).toHaveText([
    "Edge caching",
    "Cloudflare",
    "Workers",
  ])
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

const shareUrl = (url: string) =>
  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

test("the Blog links the RSS feed of its Lang", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/ru/blog")
  await expect(cards(page)).toHaveCount(3)
  const origin = new URL(page.url()).origin

  const link = page.getByRole("main").getByRole("link", { name: "RSS-лента" })
  await expect(link).toHaveAttribute("href", "/ru/rss.xml")
  const head = page.locator('head link[type="application/rss+xml"]')
  await expect(head).toHaveCount(1)
  await expect(head).toHaveAttribute("href", `${origin}/ru/rss.xml`)
  await expect(head).toHaveAttribute("title", "Блог · WebRunner")

  // Not announced outside the Blog.
  await page.goto("/ru/cv")
  await expect(head).toHaveCount(0)
})

test("a card links to its post", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en/blog")
  await expect(
    page.getByRole("main").getByRole("link", { name: "Edge caching" })
  ).toHaveAttribute("href", "/en/blog/edge-caching")
  // The Tags stay their own links above the card's.
  await cards(page).nth(0).getByRole("link", { name: "Workers" }).click()
  await expect(page).toHaveURL(/\/en\/blog\?tag=workers$/)

  // The whole card is the link: a click in its middle lands on the post.
  await cards(page).nth(1).click()
  await expect(page).toHaveURL(/\/en\/blog\/rtl-tests$/)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("RTL tests")
})

test("the post page shows the header, the body and the share link", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en/blog/edge-caching")
  const main = page.getByRole("main")

  await expect(main.getByRole("heading", { level: 1 })).toHaveText(
    "Edge caching"
  )
  await expect(page.locator("h1")).toHaveCount(1)
  await expect(page).toHaveTitle("Edge caching · WebRunner")
  await expect(main.locator("time")).toHaveText("October 20, 2026")
  await expect(main).toContainText("5 min read")
  await expect(main.getByRole("link", { name: "Workers" })).toHaveAttribute(
    "href",
    "/en/blog?tag=workers"
  )
  const cover = main.locator("header img")
  await expect(cover).toHaveAttribute("fetchpriority", "high")
  await expect(cover).toHaveAttribute("alt", "")

  // The body through Markdown: its headings sit below the title.
  await expect(main.getByRole("heading", { level: 2 })).toHaveText("Keys")
  await expect(main.locator("pre")).toHaveAttribute("data-language", "ts")
  await expect(page.getByTestId("fallback-notice")).toHaveCount(0)

  const share = main.getByRole("link", { name: "Share on LinkedIn" })
  const origin = new URL(page.url()).origin
  await expect(share).toHaveAttribute(
    "href",
    shareUrl(`${origin}/en/blog/edge-caching`)
  )
  await expect(share).toHaveAttribute("target", "_blank")
  await expect(share).toHaveAttribute("rel", "noopener noreferrer")

  await main.getByRole("link", { name: "All posts" }).click()
  await expect(page).toHaveURL(/\/en\/blog$/)
  await expect(cards(page)).toHaveCount(3)
})

test("the post page carries its JSON-LD and hreflang where it is translated", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en/blog/edge-caching")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Edge caching"
  )
  const origin = new URL(page.url()).origin

  const script = page.locator('script[type="application/ld+json"]')
  await expect(script).toHaveCount(1)
  expect(JSON.parse((await script.textContent()) ?? "")).toMatchObject({
    "@type": "BlogPosting",
    headline: "Edge caching",
    description: "What a Worker keeps and for how long.",
    datePublished: "2026-10-20T12:00:00.000Z",
    dateModified: "2026-10-21T08:00:00.000Z",
    inLanguage: "en",
    mainEntityOfPage: `${origin}/en/blog/edge-caching`,
  })
  const hreflang = page.locator('head link[rel="alternate"][hreflang]')
  await expect(hreflang).toHaveCount(5)
  expect(
    await hreflang.evaluateAll((links) =>
      links.map((link) => link.getAttribute("hreflang"))
    )
  ).toEqual(["en", "kk", "es", "de", "x-default"])

  // Gone with the post.
  await page.getByRole("link", { name: "All posts" }).click()
  await expect(cards(page)).toHaveCount(3)
  await expect(script).toHaveCount(0)
  await expect(hreflang).toHaveCount(LANGS.length + 1)
})

test("the post page on /ru marks the EN Fallback", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/ru/blog/edge-caching")
  const main = page.getByRole("main")
  await expect(main.getByTestId("fallback-notice")).toHaveText(
    "Этот пост доступен на английском."
  )
  await expect(main.locator('h1[lang="en"]')).toHaveText("Edge caching")
  await expect(main.locator('div[lang="en"] h2')).toHaveText("Keys")
  await expect(main.locator("[dir]")).toHaveCount(1) // the code block
  await expect(
    main.getByRole("link", { name: "Поделиться в LinkedIn" })
  ).toHaveAttribute(
    "href",
    /share-offsite\/\?url=.+%2Fru%2Fblog%2Fedge-caching$/
  )
  await expect(main.getByRole("link", { name: "Все посты" })).toBeVisible()

  // A post with its own Translation has no notice.
  await page.goto("/ru/blog/rtl-tests")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Тесты RTL")
  await expect(page.getByTestId("fallback-notice")).toHaveCount(0)
})

test("the Fallback on /ar reads left to right, the arrow mirrors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await mockPublicApi(page)
  await page.goto("/ar/blog/edge-caching")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  const main = page.getByRole("main")
  await expect(main.getByTestId("fallback-notice")).toBeVisible()
  await expect(main.locator('h1[lang="en"]')).toHaveAttribute("dir", "ltr")
  const body = main.locator('div[lang="en"]')
  await expect(body).toHaveAttribute("dir", "ltr")
  await expect(body.locator("h2")).toHaveCSS("direction", "ltr")

  const arrow = main.getByRole("link", { name: "كل التدوينات" }).locator("svg")
  await expect(arrow).toHaveCSS("rotate", "180deg")

  const overflow = await page
    .locator("html")
    .evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBe(0)
})

test("an unknown slug and a draft are a 404", async ({ page }) => {
  await mockPublicApi(page)
  for (const slug of ["nope", "draft"]) {
    await page.goto(`/en/blog/${slug}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" })
    ).toBeVisible()
  }
})

test("a post loads on every Lang", async ({ page }) => {
  await mockPublicApi(page)
  for (const lang of LANGS) {
    await page.goto(`/${lang}/blog/rtl-tests`)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      lang === "ru" ? "Тесты RTL" : "RTL tests"
    )
    await expect(page.locator("html")).toHaveAttribute("lang", lang)
  }
})
