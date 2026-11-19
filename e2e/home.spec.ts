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

test("the home page carries the owner as JSON-LD once the Profile arrives", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/de")
  const ld = page.locator('script[type="application/ld+json"]')
  await expect(ld).toHaveCount(1)
  expect(JSON.parse((await ld.textContent())!)).toMatchObject({
    "@type": "Person",
    name: PROFILE.name,
    jobTitle: PROFILE.headline,
    url: expect.stringMatching(/\/de$/),
  })
})

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

// Issue #199: the sections come after the page renders; Back still lands
// where the reader left it. A reload drops the loaded data, and a slow API
// keeps the page short when the router restores the scroll.
test("Back returns to where the home page was scrolled", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en")
  const link = section(page, "posts").getByRole("link", {
    name: /Post rtl-tests/,
  })
  await link.scrollIntoViewIfNeeded()
  const scrollY = await page.evaluate<number>("window.scrollY")
  expect(scrollY).toBeGreaterThan(0)
  await link.click()
  await expect(page).toHaveURL("/en/blog/rtl-tests")
  await page.reload()
  await page.route("**/api/public/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    await route.fallback()
  })
  await page.goBack()
  await expect(page).toHaveURL("/en")
  await expect
    .poll(() => page.evaluate<number>("window.scrollY"))
    .toBeGreaterThan(scrollY - 50)
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

// The Swarm (ADR-0013, issue #186) brings each chapter shown a block of the
// logo onto its rail and gathers the logo in the footer's square: squares
// that draw nothing, read by the scene. A chapter's rail is its figure's
// full stop (#203), in the figure's decoration. A hidden chapter has no
// rail. The footer's square takes room only while the scene runs, so not
// at `lite`.
const rails = (page: Page) =>
  page.locator(
    '[aria-hidden="true"] .chapter-stop [data-swarm-anchor="chapter"]'
  )
const footerSquare = (page: Page) =>
  page.locator('footer [data-swarm-anchor="footer"]')

test("each chapter shown has a rail; the footer's square waits for the scene", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en")
  for (const id of SECTIONS) {
    const rail = section(page, id).locator('[data-swarm-anchor="chapter"]')
    await expect(rail).toHaveCount(1)
    await expect(
      numeral(page, id).locator('[data-swarm-anchor="chapter"]')
    ).toHaveCount(1)
    // On the stop: centred on its tile, once it has turned into place.
    await figureInPlace(page, id)
    const box = (await rail.boundingBox())!
    const tile = (await rail.locator("..").boundingBox())!
    expect(box.width).toBeGreaterThan(0)
    expect(box.width).toBeCloseTo(box.height)
    expect(box.x + box.width / 2).toBeCloseTo(tile.x + tile.width / 2, 0)
    expect(box.y + box.height / 2).toBeCloseTo(tile.y + tile.height / 2, 0)
    // At `lite` the rust tile is the stop.
    await expect(rail.locator("..")).not.toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)"
    )
  }
  await expect(page.locator("section[data-tier]")).toHaveAttribute(
    "data-tier",
    "lite"
  )
  await expect(footerSquare(page)).toHaveAttribute("aria-hidden", "true")
  await expect(footerSquare(page)).toHaveCSS("display", "none")
})

test("a hidden chapter takes no rail", async ({ page }) => {
  await mockPublicApi(page, { ...FULL, projects: [], posts: [] })
  await page.goto("/en")
  await expect(page.locator("section[data-testid^=home-]")).toHaveCount(2)
  await expect(rails(page)).toHaveCount(2)
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
// from the start edge as the rule enters. The index is the large figure
// alone, with the rust tile as its full stop.
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

    // Up the viewport: drawn whole.
    await placeRule(page, "cv", 0.3)
    await expect
      .poll(async () => scaleX((await line(page, "cv")).transform))
      .toBe(1)
    // Nothing on the rule: one index per chapter, the figure.
    await expect(rule(page, "cv")).toBeEmpty()
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

// A chapter's index as a large figure over its `headline-lg` title (issue
// #166): decoration, sticky with the title from `lg`, `display-sm` below it
// and up to `display-md` where the content box stops growing. A rust tile
// ends it like a full stop.
const numeral = (page: Page, id: string) =>
  section(page, id).locator(".chapter-numeral")
const figure = (page: Page, id: string) =>
  numeral(page, id).locator(".chapter-figure")
const stop = (page: Page, id: string) =>
  numeral(page, id).locator(".chapter-stop")
const TURNED = /^matrix\(0\.707/

// A chapter's figure risen and its stop turned into place: its rule in
// view, its Reveal in and their animations over.
async function figureInPlace(page: Page, id: string) {
  await expect(rule(page, id)).toBeAttached()
  await placeRule(page, id, 0.3)
  await expect(rule(page, id)).toHaveClass(/reveal-in/)
  await numeral(page, id).evaluate(async (element) => {
    for (const animation of element.getAnimations({ subtree: true })) {
      await animation.finished
    }
  })
  await expect(stop(page, id)).toHaveCSS("transform", TURNED)
}

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
  await expect(figure(page, "projects")).toHaveCSS(
    "transform",
    /^matrix\(1, 0, 0, 1, 0, [1-9]/
  )
  await placeRule(page, "projects", 0.3)
  await expect(figure(page, "projects")).toHaveCSS("transform", "none")
  // The full stop turns into place after it.
  await expect(stop(page, "projects")).toHaveCSS("transform", TURNED)
})

for (const lang of ["en", "ar"]) {
  test(`/${lang}/ ends a chapter's figure with a rust full stop`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockPublicApi(page)
    await page.goto(`/${lang}`)
    await expect(rule(page, "cv")).toBeAttached()
    await placeRule(page, "cv", 0.3)
    await expect(stop(page, "cv")).toHaveCSS("transform", TURNED)
    const digits = (await figure(page, "cv").boundingBox())!
    const tile = (await stop(page, "cv").boundingBox())!
    // At the end of the figure in the reading direction, on its baseline.
    if (lang === "ar") expect(tile.x).toBeLessThan(digits.x + digits.width / 4)
    else expect(tile.x).toBeGreaterThan(digits.x + (digits.width * 3) / 4)
    expect(tile.y).toBeGreaterThan(digits.y + digits.height / 2)
  })
}

test("reduced motion stands a chapter's figure as it is", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await mockPublicApi(page)
  await page.goto("/en")
  await expect(figure(page, "projects")).toHaveCSS("transform", "none")
  await expect(stop(page, "projects")).toHaveCSS("transform", TURNED)
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

// The Swarm on the home page with content (ADR-0013): a level pinned, as
// software WebGL draws it, at a size it holds; the scene past the input
// gate. Its canvas lives under <body>, out of the page's tree (ADR-0014).
const SWARM = "/en?swarm=mobile-lite"
const liveScene = (page: Page) =>
  page.locator("[data-effect=full][data-swarm-scene]")

async function withScene(page: Page) {
  // Every View Transition the page starts (e2e has no DOM types).
  await page.addInitScript(`
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 })
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 })
    window.transitions = 0
    const start = document.startViewTransition?.bind(document)
    if (start) {
      document.startViewTransition = (...args) => {
        window.transitions++
        return start(...args)
      }
    }
  `)
  await page.setViewportSize({ width: 640, height: 480 })
  await mockPublicApi(page)
}

const consoleErrors = (page: Page) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource")
    ) {
      errors.push(message.text())
    }
  })
  page.on("pageerror", (error) => errors.push(error.message))
  return errors
}

// Issue #203: the block is the figure's full stop while the scene runs; the
// rust tile gives way to it, and nothing moves for it.
test("while the scene runs a chapter's block is its figure's stop", async ({
  page,
}) => {
  await withScene(page)
  await page.goto(SWARM)
  const tile = stop(page, "cv")
  await figureInPlace(page, "cv")
  const before = (await figure(page, "cv").boundingBox())!
  const at = (await tile.boundingBox())!
  await page.mouse.move(200, 200)
  await expect(liveScene(page)).toHaveAttribute("data-ready", "true", {
    timeout: 10_000,
  })
  await expect(tile).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
  expect(await figure(page, "cv").boundingBox()).toEqual(before)
  expect(await tile.boundingBox()).toEqual(at)
})

// Issue #204: leaving the home page while the scene runs, its dust blows off
// over the next page without a View Transition, then the canvas goes.
test("leaving the home page, the dust blows off over the next page", async ({
  page,
}) => {
  const errors = consoleErrors(page)
  await withScene(page)
  await page.goto(SWARM)
  await page.mouse.move(200, 200)
  await expect(liveScene(page)).toHaveAttribute("data-ready", "true", {
    timeout: 10_000,
  })
  await page.evaluate("window.transitions = 0")
  await section(page, "projects")
    .getByRole("link", { name: "All projects" })
    .click()
  await expect(page).toHaveURL("/en/projects")
  // The next page reads at once; the scene's canvas is no longer the home
  // page's, and it goes.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(liveScene(page)).toHaveCount(0)
  await expect(page.locator("canvas")).toHaveCount(0, { timeout: 3_000 })
  expect(await page.evaluate("window.transitions")).toBe(0)
  // Nothing is held for the footer's logo any more.
  await expect(page.locator('footer [data-swarm-anchor="footer"]')).toHaveCSS(
    "display",
    "none"
  )
  expect(errors).toEqual([])
})

test("Back to the home page while the dust leaves lays a new scene", async ({
  page,
}) => {
  const errors = consoleErrors(page)
  await withScene(page)
  await page.goto(SWARM)
  await page.mouse.move(200, 200)
  await expect(liveScene(page)).toHaveAttribute("data-ready", "true", {
    timeout: 10_000,
  })
  await section(page, "projects")
    .getByRole("link", { name: "All projects" })
    .click()
  await expect(page).toHaveURL("/en/projects")
  await page.goBack()
  await expect(page).toHaveURL(SWARM)
  await page.mouse.move(220, 220)
  // The old canvas has gone, the home page's own draws.
  await expect(liveScene(page)).toHaveAttribute("data-ready", "true", {
    timeout: 10_000,
  })
  await expect(page.locator("canvas")).toHaveCount(1, { timeout: 3_000 })
  expect(errors).toEqual([])
})

test("leaving the home page before the scene runs is a View Transition", async ({
  page,
}) => {
  await withScene(page)
  await page.goto(SWARM)
  await expect(page.locator("section[data-tier]")).toHaveAttribute(
    "data-tier",
    "lite"
  )
  // The click is the first input: the scene can't have drawn by then.
  await page.evaluate("window.transitions = 0")
  await section(page, "projects")
    .getByRole("link", { name: "All projects" })
    .click()
  await expect(page).toHaveURL("/en/projects")
  // The router starts it once the new page renders, after the URL.
  await expect.poll(() => page.evaluate("window.transitions")).toBe(1)
})
