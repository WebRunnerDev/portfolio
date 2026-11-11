import { expect, test, type Page } from "@playwright/test"

import { expectNoPageOverflow } from "./overflow"

// The sections of the home page below the hero (docs/design-brief.md › Ритм
// главной): the CV in short, every Project as a row, a banner to the Gallery
// and the latest Posts, each from its /api/public/* list and leading to its
// part of the site; one with nothing to show isn't rendered. Against an
// in-memory API (the D1 behind `vite preview` is empty).

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

const job = (id: number, role: string, endMonth: string | null) => ({
  fallback: false,
  id,
  company: `Company ${id}`,
  companyUrl: null,
  role,
  location: null,
  startMonth: "2022-03",
  endMonth,
  bullets: ["Did things."],
  technologies: [],
})

const EXPERIENCE = [
  job(1, "Frontend engineer", null),
  job(2, "QA engineer", "2023-12"),
  job(3, "Intern", "2021-06"),
  job(4, "Older role", "2020-01"),
]

const EDUCATION = [
  {
    fallback: false,
    id: 1,
    institution: "Nazarbayev University",
    degree: "BSc in Computer Science",
    diploma: null,
    gpa: null,
    startMonth: "2018-09",
    endMonth: "2022-06",
  },
]

const tech = (id: number, name: string, category: string) => ({
  id,
  name,
  category,
  icon: null,
})

const TECHNOLOGIES = [
  tech(1, "React", "frontend"),
  tech(2, "TypeScript", "frontend"),
  tech(3, "Cloudflare", "backend_cloud"),
]

const CV_PDF = {
  fallback: false,
  lang: "en",
  generatedAt: "2026-10-01T00:00:00.000Z",
}

const project = (id: number, slug: string, hasCaseStudy: boolean) => ({
  fallback: false,
  id,
  slug,
  title: `Project ${slug}`,
  description: "What it does.",
  status: "completed",
  coverKey: id === 1 ? "projects/one.png" : null,
  githubUrl: null,
  demoUrl: null,
  featured: id === 1,
  inCv: false,
  cvBullets: [],
  hasCaseStudy,
  technologies: [tech(1, "React", "frontend")],
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
  experience: unknown[]
  education: unknown[]
  technologies: unknown[]
  "cv-pdf": unknown
  projects: unknown[]
  posts: unknown[]
  albums: unknown[]
}

const FULL: Data = {
  profile: PROFILE,
  experience: EXPERIENCE,
  education: EDUCATION,
  technologies: TECHNOLOGIES,
  "cv-pdf": CV_PDF,
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

const section = (page: Page, id: string) => page.getByTestId(`home-${id}`)
const SECTIONS = ["cv", "projects", "gallery", "posts"]

test("the sections follow the hero in order, each with its data", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en")

  const shown = page.locator("section[data-testid^=home-]")
  await expect(shown).toHaveCount(4)
  for (const [i, id] of SECTIONS.entries()) {
    await expect(shown.nth(i)).toHaveAttribute("data-testid", `home-${id}`)
  }

  // The CV: the about text, the first three jobs, the Education, the
  // technologies by category and the CV PDF.
  const cv = section(page, "cv")
  await expect(cv.getByRole("heading", { level: 2 })).toHaveAccessibleName("CV")
  await expect(cv).toContainText(PROFILE.about)
  const jobs = cv.getByTestId("home-cv-experience").getByRole("listitem")
  await expect(jobs).toHaveCount(3)
  await expect(jobs.first()).toContainText("Frontend engineer")
  await expect(jobs.first()).toContainText("Company 1")
  await expect(jobs.first()).toContainText("Mar 2022 – Present")
  const education = cv.getByTestId("home-cv-education").getByRole("listitem")
  await expect(education).toHaveCount(1)
  await expect(education).toContainText("Nazarbayev University")
  await expect(education).toContainText("BSc in Computer Science")
  await expect(education).toContainText("Sep 2018 – Jun 2022")
  const groups = cv.getByTestId("home-cv-technologies").locator(":scope > li")
  await expect(groups).toHaveCount(2)
  await expect(groups.first()).toContainText("React")
  await expect(cv.getByTestId("cv-pdf-link")).toBeVisible()

  // Every Project, in the API's order, as a row without a cover.
  const rows = section(page, "projects").getByTestId("project-row")
  await expect(rows).toHaveCount(PROJECTS.length)
  await expect(rows.getByRole("heading", { level: 3 })).toHaveText(
    PROJECTS.map((p) => p.title)
  )
  await expect(rows.first()).toContainText("What it does.")
  await expect(rows.first().getByTestId("project-status")).toBeVisible()
  await expect(section(page, "projects").locator("img")).toHaveCount(0)

  // The banner counts the Albums with photos and shows three covers, lazy
  // and sized against layout shift.
  const banner = section(page, "gallery").getByRole("link")
  await expect(banner).toHaveCount(1)
  await expect(banner).toContainText("4 albums · 16 photos")
  const covers = banner.locator("img")
  await expect(covers).toHaveCount(3)
  await expect(covers.first()).toHaveAttribute("loading", "lazy")
  await expect(covers.first()).toHaveAttribute("width", "1200")
  await expect(covers.first()).toHaveAttribute("height", "900")

  // The three newest, date and title.
  const posts = section(page, "posts").getByRole("listitem")
  await expect(posts).toHaveCount(3)
  await expect(posts.first()).toContainText("Post edge-caching")
  await expect(posts.first().locator("time")).toHaveAttribute(
    "datetime",
    POSTS[0].publishedAt
  )
})

const LINKS: [string, string | RegExp, string][] = [
  ["cv", "Full CV", "/en/cv"],
  ["projects", "All projects", "/en/projects"],
  ["gallery", /Open the gallery/, "/en/gallery"],
  ["posts", "All posts", "/en/blog"],
]

for (const [id, name, path] of LINKS) {
  test(`the ${id} section leads to ${path}`, async ({ page }) => {
    await mockPublicApi(page)
    await page.goto("/en")
    await section(page, id).getByRole("link", { name }).click()
    await expect(page).toHaveURL(path)
  })
}

test("a project with a Case Study and a post link to their pages", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en")
  const projects = section(page, "projects")
  await expect(
    projects.getByRole("link", { name: "Project notes" })
  ).toHaveAttribute("href", "/en/projects/notes")
  // No Case Study, no page: the row isn't a link.
  await expect(projects.getByRole("link", { name: "Project ams" })).toHaveCount(
    0
  )
  await expect(
    section(page, "posts").getByRole("link", { name: /Post rtl-tests/ })
  ).toHaveAttribute("href", "/en/blog/rtl-tests")
})

test("a project row opens its page from anywhere on it", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en")
  const row = section(page, "projects").getByTestId("project-row").nth(2)
  // The title's link stretches over the row.
  await row.click()
  await expect(page).toHaveURL("/en/projects/notes")
})

test("a section with nothing to show isn't rendered", async ({ page }) => {
  await mockPublicApi(page, {
    profile: { ...PROFILE, about: null },
    experience: [],
    education: [],
    technologies: [],
    "cv-pdf": null,
    projects: [],
    posts: [],
    albums: [album(3, "empty", false)],
  })
  await page.goto("/en")
  await expect(page.locator("section[data-tier]")).toBeVisible()
  await expect(page.locator("section[data-testid^=home-]")).toHaveCount(0)
})

test("the CV shows without the about text and without a PDF", async ({
  page,
}) => {
  await mockPublicApi(page, {
    ...FULL,
    profile: { ...PROFILE, about: null },
    "cv-pdf": null,
  })
  await page.goto("/en")
  const cv = section(page, "cv")
  await expect(cv.getByTestId("home-cv-experience")).toBeVisible()
  await expect(cv.getByTestId("cv-pdf-link")).toHaveCount(0)
})

test("no section when the API fails", async ({ page }) => {
  await page.route("**/api/public/**", (route) =>
    route.fulfill({ status: 500, json: { error: "internal" } })
  )
  await page.goto("/en")
  await expect(page.locator("section[data-tier]")).toBeVisible()
  await expect(page.locator("section[data-testid^=home-]")).toHaveCount(0)
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

// A chapter's rule opens with the scroll (issue #159): its hairline draws
// from the start edge as the rule enters, the tile turns into place, and the
// index rises from under its mask.
const rule = (page: Page, id: string) =>
  section(page, id).locator(".chapter-open")

// The rule in the page's script (e2e has no DOM types).
const RULE = (id: string) =>
  `document.querySelector("[data-testid=home-${id}] .chapter-open")`

// The hairline's computed style, read from its `::before`.
const line = (page: Page, id: string) =>
  page.evaluate<{ transform: string; origin: string }>(`(() => {
    const style = getComputedStyle(${RULE(id)}, "::before")
    return { transform: style.transform, origin: style.transformOrigin }
  })()`)

// Scrolls the rule's top to `fraction` of the viewport's height from its top.
const placeRule = (page: Page, id: string, fraction: number) =>
  page.evaluate(`scrollTo(0,
    ${RULE(id)}.getBoundingClientRect().top + scrollY - innerHeight * ${fraction}
  )`)

const scaleX = (transform: string) =>
  transform === "none" ? 1 : Number(transform.match(/matrix\(([^,]+)/)![1])

for (const lang of ["en", "ar"]) {
  test(`/${lang}/ draws a chapter's hairline from the reading start`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockPublicApi(page)
    await page.goto(`/${lang}`)
    await expect(rule(page, "cv")).toBeAttached()
    const { width } = (await rule(page, "cv").boundingBox())!

    // Just in: the line has barely started.
    await placeRule(page, "cv", 0.98)
    await expect
      .poll(async () => scaleX((await line(page, "cv")).transform))
      .toBeLessThan(0.5)
    // From the left in LTR, from the right in RTL.
    const { origin } = await line(page, "cv")
    expect(Number.parseFloat(origin)).toBeCloseTo(lang === "ar" ? width : 0, 0)

    // Up the viewport: drawn whole, the tile turned, the index risen.
    await placeRule(page, "cv", 0.3)
    await expect
      .poll(async () => scaleX((await line(page, "cv")).transform))
      .toBe(1)
    await expect(rule(page, "cv").locator(".chapter-tile")).toHaveCSS(
      "transform",
      /^matrix\(0\.707/
    )
    await expect(rule(page, "cv").locator(".chapter-index")).toHaveCSS(
      "transform",
      "none",
      { pseudo: "before" }
    )
    await expect(rule(page, "cv")).toHaveCSS("opacity", "1")
  })
}

test("reduced motion stands a chapter's rule as it is", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await mockPublicApi(page)
  await page.goto("/en")
  await expect(rule(page, "cv")).toBeAttached()
  await placeRule(page, "cv", 0.98)
  expect((await line(page, "cv")).transform).toBe("none")
  expect(
    await rule(page, "cv").evaluate(
      (element) => element.getAnimations({ subtree: true }).length
    )
  ).toBe(0)
})

// A chapter's index again as a large figure over its `headline-lg` title
// (issue #166): decoration, sticky with the title from `lg`, `display-sm`
// below it and up to `display-md` where the content box stops growing.
const numeral = (page: Page, id: string) =>
  section(page, id).locator(".chapter-numeral")

for (const [width, size] of [
  [360, "72px"],
  [1024, "72px"],
  [1280, "120px"],
] as const) {
  test(`a chapter's figure is ${size} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await mockPublicApi(page)
    await page.goto("/en")
    await expect(numeral(page, "cv")).toHaveAttribute("aria-hidden", "true")
    await expect(numeral(page, "cv")).toHaveCSS("font-size", size)
    await expect(
      section(page, "cv").getByRole("heading", { level: 2 })
    ).toHaveCSS("font-size", "40px")
    // It goes with the title: in its sticky box from `lg`, above it below.
    await expect(numeral(page, "cv").locator("..")).toHaveCSS(
      "position",
      width >= 1024 ? "sticky" : "static"
    )
  })
}

test("/ar/ sets a chapter's figure and title without tracking", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await mockPublicApi(page)
  await page.goto("/ar")
  // Chrome reports a zero letter-spacing as `normal`.
  await expect(numeral(page, "cv")).toHaveCSS("letter-spacing", "normal")
  await expect(
    section(page, "cv").getByRole("heading", { level: 2 })
  ).toHaveCSS("letter-spacing", "normal")
  await expectNoPageOverflow(page)
})

test("a chapter's figure rises with its rule", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await mockPublicApi(page)
  await page.goto("/en")
  await expect(rule(page, "projects")).toBeAttached()
  // Under its mask until the rule is in view.
  await expect(numeral(page, "projects")).toHaveCSS(
    "transform",
    /^matrix\(1, 0, 0, 1, 0, [1-9]/,
    { pseudo: "before" }
  )
  await placeRule(page, "projects", 0.3)
  await expect(numeral(page, "projects")).toHaveCSS("transform", "none", {
    pseudo: "before",
  })
})

test("reduced motion stands a chapter's figure as it is", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await mockPublicApi(page)
  await page.goto("/en")
  await expect(numeral(page, "projects")).toHaveCSS("transform", "none", {
    pseudo: "before",
  })
})

test("/ar/ mirrors the sections", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await mockPublicApi(page)
  await page.goto("/ar")

  // The about text sits a third in from the start: from the right in RTL,
  // so more room is left on its right than on its left.
  const about = section(page, "cv").locator("p", { hasText: PROFILE.about })
  await about.scrollIntoViewIfNeeded()
  const box = (await about.boundingBox())!
  expect(1280 - (box.x + box.width)).toBeGreaterThan(box.x)

  // The status stands at the row's end: on the left in RTL.
  const row = section(page, "projects").getByTestId("project-row").first()
  await row.scrollIntoViewIfNeeded()
  const rowBox = (await row.boundingBox())!
  const status = (await row.getByTestId("project-status").boundingBox())!
  expect(status.x - rowBox.x).toBeLessThan(
    rowBox.x + rowBox.width - (status.x + status.width)
  )
  await expectNoPageOverflow(page)
})

test("the sections don't scroll the page sideways at 360px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await mockPublicApi(page)
  await page.goto("/en")
  for (const id of SECTIONS) {
    await section(page, id).scrollIntoViewIfNeeded()
  }
  await expect(section(page, "gallery").locator("img")).toHaveCount(3)
  await expectNoPageOverflow(page)
})

// The chapter titles are `headline-lg` over a 72px figure: the long kk and
// de words wrap at the narrowest viewport, nothing runs off the page.
test("the chapters don't scroll the page sideways at 320px in any Lang", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await mockPublicApi(page)
  for (const lang of ["en", "ru", "kk", "de", "es", "ar"]) {
    await page.goto(`/${lang}`)
    await expect(section(page, "posts")).toBeAttached()
    await expectNoPageOverflow(page, `/${lang}`)
  }
})
