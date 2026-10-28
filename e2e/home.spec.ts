import { expect, test, type Page } from "@playwright/test"

// Issue #118: the sections of the home page below the hero
// (docs/design-brief.md › Home rhythm), each from its /api/public/* list and
// leading to its part of the site; one with nothing to show isn't rendered.
// Against an in-memory API (the D1 behind `vite preview` is empty).

const PROFILE = {
  fallback: false,
  name: "Aibyn Serikov",
  headline: "Web developer",
  about: "I build fast, accessible sites on the edge.",
  location: null,
  email: null,
  telegramUrl: null,
  linkedinUrl: null,
  githubUrl: null,
  photoKey: null,
}

const project = (id: number, slug: string, featured: boolean) => ({
  fallback: false,
  id,
  slug,
  title: `Project ${slug}`,
  description: "What it does.",
  status: "completed",
  coverKey: id === 1 ? "projects/one.png" : null,
  githubUrl: null,
  demoUrl: null,
  featured,
  inCv: false,
  cvBullets: [],
  hasCaseStudy: true,
  technologies: [],
})

const PROJECTS = [
  project(1, "plotops", true),
  project(2, "ams", false),
  project(3, "notes", true),
  project(4, "radio", true),
  project(5, "extra", true),
]

const post = (id: number, slug: string, publishedAt: string) => ({
  fallback: false,
  id,
  slug,
  title: `Post ${slug}`,
  excerpt: "",
  readingMinutes: 3,
  coverKey: null,
  publishedAt,
  tags: [],
})

const POSTS = [
  post(1, "edge-caching", "2026-10-20T12:00:00.000Z"),
  post(2, "rtl-tests", "2026-09-03T12:00:00.000Z"),
  post(3, "notes", "2026-05-15T12:00:00.000Z"),
  post(4, "older", "2026-01-15T12:00:00.000Z"),
]

const album = (id: number, slug: string, withCover: boolean) => ({
  fallback: false,
  id,
  slug,
  title: `Album ${slug}`,
  cover: withCover
    ? { key: `photos/${slug}.jpg`, width: 1200, height: 900 }
    : null,
  photoCount: withCover ? 4 : 0,
})

const ALBUMS = [
  album(1, "trips", true),
  album(2, "cats", true),
  album(3, "empty", false),
  album(4, "city", true),
  album(5, "sea", true),
]

type Data = {
  profile: Omit<typeof PROFILE, "about"> & { about: string | null }
  projects: unknown[]
  posts: unknown[]
  albums: unknown[]
}

const FULL: Data = {
  profile: PROFILE,
  projects: PROJECTS,
  posts: POSTS,
  albums: ALBUMS,
}

async function mockPublicApi(page: Page, data: Data = FULL) {
  // Cloudflare Images only runs on the zone.
  await page.route("**/cdn-cgi/image/**", (route) =>
    route.fulfill({ status: 404 })
  )
  await page.route("**/api/public/**", (route) => {
    const [, , , , entity, slug] = new URL(
      route.request().url()
    ).pathname.split("/")
    const json = slug ? undefined : data[entity as keyof Data]
    if (json === undefined || json === null) {
      return route.fulfill({ status: 404, json: { error: "not_found" } })
    }
    return route.fulfill({ json })
  })
}

const horizontalOverflow = (page: Page) =>
  page
    .locator("html")
    .evaluate(
      (el: { scrollWidth: number; clientWidth: number }) =>
        el.scrollWidth - el.clientWidth
    )

const section = (page: Page, id: string) => page.getByTestId(`home-${id}`)
const SECTIONS = ["about", "projects", "posts", "gallery"]

test("the sections follow the hero in order, each with its data", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en")

  const shown = page.locator("[data-testid^=home-]")
  await expect(shown).toHaveCount(4)
  for (const [i, id] of SECTIONS.entries()) {
    await expect(shown.nth(i)).toHaveAttribute("data-testid", `home-${id}`)
  }

  await expect(
    section(page, "about").getByRole("heading", { level: 2 })
  ).toHaveAccessibleName("About me")
  await expect(section(page, "about")).toContainText(PROFILE.about)

  // The Featured ones only, three at most, the first one wide.
  const cards = section(page, "projects").getByTestId("project-card")
  await expect(cards).toHaveCount(3)
  await expect(cards.getByRole("heading", { level: 3 })).toHaveText([
    "Project plotops",
    "Project notes",
    "Project radio",
  ])

  // The three newest, date and title.
  const posts = section(page, "posts").getByRole("listitem")
  await expect(posts).toHaveCount(3)
  await expect(posts.first()).toContainText("Post edge-caching")
  await expect(posts.first().locator("time")).toHaveAttribute(
    "datetime",
    POSTS[0].publishedAt
  )

  // Albums with photos only; covers lazy, sized against layout shift.
  const albums = section(page, "gallery").getByRole("listitem")
  await expect(albums).toHaveCount(4)
  const cover = albums.first().locator("img")
  await expect(cover).toHaveAttribute("loading", "lazy")
  await expect(cover).toHaveAttribute("width", "1200")
  await expect(cover).toHaveAttribute("height", "900")
  await expect(cover).toHaveAttribute("srcset", /640w/)
})

const LINKS: [string, string, string][] = [
  ["about", "Full CV", "/en/cv"],
  ["projects", "All projects", "/en/projects"],
  ["posts", "All posts", "/en/blog"],
  ["gallery", "All albums", "/en/gallery"],
]

for (const [id, name, path] of LINKS) {
  test(`the ${id} section leads to ${path}`, async ({ page }) => {
    await mockPublicApi(page)
    await page.goto("/en")
    await section(page, id).getByRole("link", { name }).click()
    await expect(page).toHaveURL(path)
  })
}

test("a post and an album link to their pages", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en")
  await expect(
    section(page, "posts").getByRole("link", { name: /Post rtl-tests/ })
  ).toHaveAttribute("href", "/en/blog/rtl-tests")
  await expect(
    section(page, "gallery").getByRole("link", { name: /Album cats/ })
  ).toHaveAttribute("href", "/en/gallery/cats")
})

test("a section with nothing to show isn't rendered", async ({ page }) => {
  await mockPublicApi(page, {
    profile: { ...PROFILE, about: null },
    projects: PROJECTS.map((p) => ({ ...p, featured: false })),
    posts: POSTS,
    albums: [album(3, "empty", false)],
  })
  await page.goto("/en")
  await expect(section(page, "posts")).toBeVisible()
  for (const id of ["about", "projects", "gallery"]) {
    await expect(section(page, id)).toHaveCount(0)
  }
})

test("no section when the API fails", async ({ page }) => {
  await page.route("**/api/public/**", (route) =>
    route.fulfill({ status: 500, json: { error: "internal" } })
  )
  await page.goto("/en")
  await expect(page.locator("section[data-tier]")).toBeVisible()
  await expect(page.locator("[data-testid^=home-]")).toHaveCount(0)
})

test("reduced motion shows the sections as they are", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await mockPublicApi(page)
  await page.goto("/en")
  for (const id of SECTIONS) {
    await section(page, id).scrollIntoViewIfNeeded()
    await expect(
      section(page, id).getByRole("heading", { level: 2 })
    ).toBeVisible()
  }
  await expect(section(page, "posts").getByRole("listitem").first()).toHaveCSS(
    "opacity",
    "1"
  )
})

test("/ar/ mirrors the sections; the gallery strip scrolls on its own", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await mockPublicApi(page)
  await page.goto("/ar")

  // The about text sits a third in from the start: from the right in RTL,
  // so more room is left on its right than on its left.
  const about = section(page, "about").locator("p").last()
  await about.scrollIntoViewIfNeeded()
  const box = (await about.boundingBox())!
  expect(1280 - (box.x + box.width)).toBeGreaterThan(box.x)

  // The strip runs from the start edge of the content to the end edge of
  // the viewport, and the page itself doesn't scroll sideways.
  const albums = section(page, "gallery").getByRole("listitem")
  await albums.first().scrollIntoViewIfNeeded()
  const first = (await albums.first().boundingBox())!
  const second = (await albums.nth(1).boundingBox())!
  expect(second.x).toBeLessThan(first.x)
  expect(await horizontalOverflow(page)).toBe(0)
})

test("the strip doesn't scroll the page sideways at 360px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await mockPublicApi(page)
  await page.goto("/en")
  await section(page, "gallery").scrollIntoViewIfNeeded()
  await expect(section(page, "gallery").getByRole("listitem")).toHaveCount(4)
  expect(await horizontalOverflow(page)).toBe(0)
})
