import { expect, test, type Page } from "@playwright/test"

import { expectNoPageOverflow } from "./overflow"

import { markdownTree } from "../contracts/markdown/parse"

// Issues #69 and #70: the Projects page as a card grid and the Case Study page,
// against an in-memory /api/public/* (the D1 behind `vite preview` is empty).
// Only PlotOps has a Case Study; on RU, PlotOps and AITU AMS only have their
// EN Translation.
const react = { id: 1, name: "React", category: "frontend", icon: null }
const hono = { id: 2, name: "Hono", category: "backend_cloud", icon: null }

const CASE_STUDY = [
  "# Problem",
  "",
  "Paper forms <b>everywhere</b>.",
  "",
  "<script>globalThis.injected = true</script>",
  "",
  "See [the repo](https://github.com/me/plotops) and [the CV](/en/cv).",
  "",
  "![The map](/media/projects/map.png)",
  "",
  "```ts",
  `const plots = await db.select().from(plot).where(eq(plot.owner, me)).orderBy(plot.createdAt) // ${"x".repeat(80)}`,
  "```",
].join("\n")

function projects(lang: string) {
  const ru = lang === "ru"
  return [
    {
      fallback: false,
      id: 1,
      slug: "plotops",
      title: ru ? "ПлотОпс" : "PlotOps",
      description: ru ? "Полевые работы" : "Field operations",
      status: "in_progress",
      coverKey: "projects/plotops.png",
      githubUrl: "https://github.com/me/plotops",
      demoUrl: "https://plotops.example",
      featured: true,
      inCv: true,
      cvBullets: [],
      hasCaseStudy: true,
      technologies: [react, hono],
    },
    {
      fallback: ru,
      id: 2,
      slug: "ams",
      title: "AITU AMS",
      description: "Attendance management",
      status: "completed",
      coverKey: "projects/ams.png",
      githubUrl: "https://github.com/me/ams",
      demoUrl: null,
      featured: false,
      inCv: true,
      cvBullets: [],
      hasCaseStudy: false,
      technologies: [react],
    },
    {
      fallback: false,
      id: 3,
      slug: "old",
      title: ru ? "Старый" : "Old one",
      description: ru ? "Давно" : "Long ago",
      status: "archived",
      coverKey: null,
      githubUrl: null,
      demoUrl: null,
      featured: false,
      inCv: false,
      cvBullets: [],
      hasCaseStudy: false,
      technologies: [],
    },
  ]
}

// The page of PlotOps on RU comes with its EN Translation.
const fallbackPlotOps = {
  fallback: true,
  title: "PlotOps",
  description: "Field operations",
}

async function mockPublicApi(page: Page, { empty = false } = {}) {
  // The Worker sends the Case Study rendered.
  const caseStudy = await markdownTree(CASE_STUDY)
  // Cloudflare Images only runs on the zone.
  await page.route("**/cdn-cgi/image/**", (route) =>
    route.fulfill({ status: 404 })
  )
  await page.route("**/api/public/**", (route) => {
    const [, , , lang, entity, slug] = new URL(
      route.request().url()
    ).pathname.split("/")
    const list = empty ? [] : projects(lang)
    if (entity !== "projects") {
      return route.fulfill({ status: 404, json: { error: "not_found" } })
    }
    if (!slug) return route.fulfill({ json: list })
    const found = list.find((p) => p.slug === slug)
    return found
      ? route.fulfill({
          json: {
            ...found,
            ...(lang === "ru" && slug === "plotops" && fallbackPlotOps),
            caseStudy: found.hasCaseStudy ? caseStudy : null,
          },
        })
      : route.fulfill({ status: 404, json: { error: "not_found" } })
  })
}

const cards = (page: Page) => page.getByTestId("project-card")

test("cards on /en show status, technologies and links", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en/projects")
  await expect(cards(page)).toHaveCount(3)

  const plotops = cards(page).nth(0)
  await expect(plotops.getByRole("heading", { level: 2 })).toHaveText("PlotOps")
  await expect(plotops.getByTestId("project-status")).toHaveText("In progress")
  await expect(plotops.getByRole("listitem")).toHaveText(["React", "Hono"])
  await expect(plotops.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/me/plotops"
  )
  await expect(plotops.getByRole("link", { name: "Demo" })).toHaveAttribute(
    "target",
    "_blank"
  )

  await expect(cards(page).getByTestId("project-status")).toHaveText([
    "In progress",
    "Completed",
    "Archived",
  ])
  await expect(page.getByTestId("fallback-notice")).toHaveCount(0)
})

test("only a card with a Case Study links to it", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en/projects")
  const main = page.getByRole("main")
  await expect(main.getByRole("link", { name: "PlotOps" })).toHaveAttribute(
    "href",
    "/en/projects/plotops"
  )
  await expect(main.getByRole("link", { name: "AITU AMS" })).toHaveCount(0)
  await expect(main.getByRole("link", { name: "Old one" })).toHaveCount(0)
  // The other links stay their own: GitHub of AITU AMS is reachable.
  await expect(
    cards(page).nth(1).getByRole("link", { name: "GitHub" })
  ).toBeVisible()

  // The whole card is the link: a click in its middle lands on it.
  await cards(page).nth(0).click()
  await expect(page).toHaveURL(/\/en\/projects\/plotops$/)
})

test("cards on /ru translate the status and mark the Fallback", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/ru/projects")
  await expect(cards(page).getByTestId("project-status")).toHaveText([
    "В работе",
    "Завершён",
    "В архиве",
  ])
  await expect(
    cards(page).nth(0).getByRole("link", { name: "Демо" })
  ).toBeVisible()

  const ams = cards(page).nth(1)
  await expect(ams.getByTestId("fallback-notice")).toHaveText(
    "Пока только на английском."
  )
  await expect(ams.locator('h2[lang="en"]')).toHaveText("AITU AMS")
  await expect(page.getByTestId("fallback-notice")).toHaveCount(1)
})

test("covers load through Cloudflare Images, lazily after the first", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en/projects")
  const first = cards(page).nth(0).locator("img")
  const second = cards(page).nth(1).locator("img")
  await expect(first).toHaveAttribute(
    "srcset",
    /\/cdn-cgi\/image\/width=640,fit=scale-down,format=auto\/media\/projects\/plotops\.png 640w/
  )
  await expect(first).toHaveAttribute("fetchpriority", "high")
  await expect(second).toHaveAttribute("loading", "lazy")
  // No cover: the logo tiles, hidden from assistive technology.
  await expect(cards(page).nth(2).locator("img")).toHaveCount(0)
})

test("an empty list says what appears there", async ({ page }) => {
  await mockPublicApi(page, { empty: true })
  await page.goto("/en/projects")
  await expect(page.getByTestId("projects-empty")).toContainText(
    "No projects yet"
  )
  await expect(cards(page)).toHaveCount(0)
})

// DESIGN.md › Badge, docs/design-brief.md › Детали: the active project's
// badge speaks rust, not green: a `primary` outline round `primary-text` on
// `surface`, one size with the neutral badge, and a tile that breathes in
// place of an icon. The text stays its accessible name.
const PRIMARY = "rgb(184, 69, 48)"
const PRIMARY_TEXT = { light: "rgb(168, 63, 44)", dark: "rgb(218, 106, 82)" }
const SURFACE = { light: "rgb(243, 244, 246)", dark: "rgb(18, 18, 18)" }

for (const colorScheme of ["light", "dark"] as const) {
  test(`the active badge is a rust outline with a breathing tile (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await mockPublicApi(page)
    await page.goto("/en/projects")
    const active = cards(page).nth(0).getByTestId("project-status")
    const completed = cards(page).nth(1).getByTestId("project-status")
    await expect(active).toHaveText("In progress")

    await expect(active).toHaveCSS("border-top-color", PRIMARY)
    await expect(active).toHaveCSS("color", PRIMARY_TEXT[colorScheme])
    await expect(active).toHaveCSS("background-color", SURFACE[colorScheme])
    const [a, c] = [
      (await active.boundingBox())!,
      (await completed.boundingBox())!,
    ]
    expect(a.height).toBe(c.height)

    const tile = active.getByTestId("status-tile")
    await expect(tile).toHaveCSS("animation-name", "status-breathe")
    await expect(tile).toHaveCSS("background-color", PRIMARY)
    await expect(active.locator("svg")).toHaveCount(0)
    await expect(active.locator("[aria-hidden=true]")).toHaveCount(1)
  })
}

test("reduced motion stands the active badge's tile lit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await mockPublicApi(page)
  await page.goto("/en/projects")
  const tile = cards(page).nth(0).getByTestId("status-tile")
  await expect(tile).toHaveCSS("animation-name", "none")
  await expect(tile).toHaveCSS("opacity", "1")
})

test("the grid mirrors on /ar and fits 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await mockPublicApi(page)
  await page.goto("/ar/projects")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(cards(page)).toHaveCount(3)

  // The status sits at the end of the title row: left in RTL.
  const card = await cards(page).nth(0).boundingBox()
  const status = await cards(page)
    .nth(0)
    .getByTestId("project-status")
    .boundingBox()
  expect(status!.x - card!.x).toBeLessThan(card!.width / 2)

  await expectNoPageOverflow(page)
})

test("the Case Study page shows the header and the Markdown", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en/projects/plotops")
  const main = page.getByRole("main")

  await expect(main.getByRole("heading", { level: 1 })).toHaveText("PlotOps")
  await expect(page).toHaveTitle("PlotOps · WebRunner")
  await expect(main.getByTestId("project-status")).toHaveText("In progress")
  await expect(main.locator("header li")).toHaveText(["React", "Hono"])
  await expect(main.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/me/plotops"
  )
  await expect(main.getByRole("link", { name: "Projects" })).toHaveAttribute(
    "href",
    "/en/projects"
  )
  // The cover is the LCP: no lazy loading.
  const cover = main.locator("header img")
  await expect(cover).toHaveAttribute("fetchpriority", "high")
  await expect(cover).toHaveAttribute(
    "src",
    "/cdn-cgi/image/width=1280,fit=scale-down,format=auto/media/projects/plotops.png"
  )

  // The Markdown: its headings sit below the title, raw HTML is gone.
  await expect(main.getByRole("heading", { level: 2 })).toHaveText("Problem")
  await expect(main.getByText("Paper forms everywhere.")).toBeVisible()
  await expect(main.locator("b, script")).toHaveCount(0)
  expect(await page.evaluate(() => "injected" in globalThis)).toBe(false)
  const repo = main.getByRole("link", { name: "the repo" })
  await expect(repo).toHaveAttribute("target", "_blank")
  await expect(repo).toHaveAttribute("rel", /noopener/)
  await expect(main.getByRole("link", { name: "the CV" })).not.toHaveAttribute(
    "target",
    "_blank"
  )
  await expect(main.getByRole("img", { name: "The map" })).toHaveAttribute(
    "src",
    /^\/cdn-cgi\/image\/width=960,[^/]+\/media\/projects\/map\.png$/
  )
  await expect(main.locator("pre")).toHaveAttribute("data-language", "ts")
  await expect(page.getByTestId("fallback-notice")).toHaveCount(0)
})

test("a project without a Case Study and an unknown slug are a 404", async ({
  page,
}) => {
  await mockPublicApi(page)
  for (const slug of ["ams", "nope"]) {
    await page.goto(`/en/projects/${slug}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" })
    ).toBeVisible()
  }
})

// Issue #97: Shiki, its engine and themes are one chunk, each language
// another. #142: only the admin's preview loads them; the Worker highlights
// the public pages.
const SHIKI = /\/assets\/(highlight|typescript)-[\w-]+\.js$/

test("the Case Study shows its code highlighted in both themes", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" })
  const shiki: string[] = []
  page.on("request", (request) => {
    if (SHIKI.test(request.url())) shiki.push(request.url())
  })
  await mockPublicApi(page)
  await page.goto("/en/projects/plotops")

  const code = page.getByRole("main").locator("pre")
  await expect(code).toHaveAttribute("data-highlighted", "")
  await expect(code).toHaveAttribute("dir", "ltr")
  await expect(code).toContainText("const plots = await db.select()")
  const keyword = code.locator(".shiki-token", { hasText: /^const$/ })
  await expect(keyword).toHaveCSS("color", "rgb(160, 17, 31)")

  // The theme switch only repaints the tokens.
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await expect(keyword).toHaveCSS("color", "rgb(255, 123, 114)")
  expect(shiki).toEqual([])
})

test("a page without code doesn't load Shiki either", async ({ page }) => {
  const shiki: string[] = []
  page.on("request", (request) => {
    if (SHIKI.test(request.url())) shiki.push(request.url())
  })
  await mockPublicApi(page)
  await page.goto("/en/projects")
  await expect(cards(page)).toHaveCount(3)
  await page.waitForLoadState("networkidle")
  expect(shiki).toEqual([])
})

test("the Case Study on /ru marks the EN Fallback", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/ru/projects/plotops")
  const main = page.getByRole("main")
  await expect(main.getByTestId("fallback-notice")).toHaveText(
    "Пока только на английском."
  )
  await expect(main.locator('h1[lang="en"]')).toHaveText("PlotOps")
  await expect(main.locator('div[lang="en"] h2')).toHaveText("Problem")
  await expect(main.getByRole("link", { name: "Проекты" })).toBeVisible()
})

test("the Case Study mirrors on /ar but its code doesn't, at 360px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await mockPublicApi(page)
  await page.goto("/ar/projects/plotops")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")

  const code = page.getByRole("main").locator("pre")
  await expect(code).toHaveAttribute("data-highlighted", "")
  await expect(code).toHaveAttribute("dir", "ltr")
  await expect(code).toHaveCSS("direction", "ltr")
  // The long line scrolls inside the block, not the page.
  expect(await code.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true
  )
  await expectNoPageOverflow(page)
})

// Issue #119, DESIGN.md › Card: hover and keyboard focus look the same, a
// tile fills the cut corner and the title moves along the reading direction.
test("a card answers hover and keyboard focus alike", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await mockPublicApi(page)
  await page.goto("/en/projects")
  const plotops = cards(page).nth(0)
  const link = plotops.getByRole("link", { name: "PlotOps" })
  const tile = plotops.getByTestId("card-corner").locator("span")
  const title = link.locator("span")
  await expect(tile).toHaveCSS("scale", "0")

  await plotops.hover()
  await expect(tile).toHaveCSS("scale", "1.415")
  await expect(title).toHaveCSS("translate", "4px")
  // No shadow, not even in dark mode: the border shows the state.
  await expect(plotops).toHaveCSS("filter", "none")

  await page.mouse.move(0, 0)
  await expect(tile).toHaveCSS("scale", "0")
  await expect(title).toHaveCSS("translate", "none")

  await link.focus()
  await expect(tile).toHaveCSS("scale", "1.415")
  await expect(title).toHaveCSS("translate", "4px")
})

test("the title of a card moves the other way in RTL", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/ar/projects")
  const plotops = cards(page).nth(0)
  await plotops.getByRole("link", { name: "PlotOps" }).focus()
  await expect(
    plotops.getByRole("link", { name: "PlotOps" }).locator("span")
  ).toHaveCSS("translate", "-4px")
})

type Transition = { types: string[]; cover: string | null }

// Issue #119: each View Transition the router starts, its types and which
// cover carries the shared name in the page being left.
async function recordTransitions(page: Page) {
  // No DOM types in e2e/: only what is used.
  type Cover = { dataset: { sharedCover?: string } }
  type Browser = {
    transitions: Transition[]
    getComputedStyle: (el: Cover) => { viewTransitionName: string }
    document: {
      querySelectorAll: (selector: string) => Iterable<Cover>
      startViewTransition: (
        arg?: { types?: string[] } | (() => void)
      ) => unknown
    }
  }
  await page.addInitScript(() => {
    const browser = globalThis as unknown as Browser
    const { document } = browser
    const start = document.startViewTransition.bind(document)
    browser.transitions = []
    document.startViewTransition = (arg) => {
      const named = [...document.querySelectorAll("[data-shared-cover]")].find(
        (el) => browser.getComputedStyle(el).viewTransitionName === "card-cover"
      )
      browser.transitions.push({
        types: typeof arg === "object" ? [...(arg.types ?? [])] : [],
        cover: named?.dataset.sharedCover ?? null,
      })
      return start(arg)
    }
  })
  return () =>
    page.evaluate(() =>
      (globalThis as unknown as Browser).transitions.filter(
        (t) => t.types.length > 0
      )
    )
}

test("opening a card goes forward and shares its cover; Back goes back", async ({
  page,
}) => {
  await mockPublicApi(page)
  const transitions = await recordTransitions(page)
  await page.goto("/en/projects")
  await cards(page).nth(0).click()
  await expect(page).toHaveURL(/\/en\/projects\/plotops$/)
  await expect
    .poll(transitions)
    .toEqual([{ types: ["forward"], cover: "project:plotops" }])
  await expect(
    page.getByRole("main").locator('img[data-shared-cover="project:plotops"]')
  ).toHaveCSS("view-transition-name", "card-cover")

  await page.goBack()
  await expect(page).toHaveURL(/\/en\/projects$/)
  await expect.poll(transitions).toEqual([
    { types: ["forward"], cover: "project:plotops" },
    { types: ["back"], cover: "project:plotops" },
  ])
})

// #212: the strip of the page's items in its head. A rhombus per Project
// with its status; pointed at, its card lights, and the other way round.
const strip = (page: Page) => page.getByTestId("item-strip")
const tiles = (page: Page) => page.locator(".item-strip-tile")

test("the strip has a rhombus per Project, its status, and a summary", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en/projects")
  await expect(cards(page)).toHaveCount(3)
  await expect(tiles(page)).toHaveCount(3)
  await expect(tiles(page).nth(0)).toHaveAttribute("data-state", "active")
  await expect(tiles(page).nth(1)).toHaveAttribute("data-state", "done")
  await expect(tiles(page).nth(2)).toHaveAttribute("data-state", "archived")
  await expect(strip(page)).toContainText("3 projects · 1 in progress")
  await expect(strip(page)).toHaveAttribute("aria-hidden", "true")
})

test("a rhombus pointed at lights its card, and a card its rhombus", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en/projects")
  await tiles(page).nth(1).hover()
  await expect(cards(page).nth(1)).toHaveAttribute("data-hot", "")
  await expect(strip(page)).toContainText("02 · AITU AMS · Completed")
  await expect(page.locator(".item-strip-row")).toHaveAttribute(
    "data-lit",
    "true"
  )

  await cards(page).nth(2).hover()
  await expect(tiles(page).nth(2)).toHaveAttribute("data-hot", "true")
  await expect(cards(page).nth(1)).not.toHaveAttribute("data-hot")
  await page.mouse.move(0, 0)
  await expect(strip(page)).toContainText("3 projects · 1 in progress")
})

test("a click on a rhombus brings its card into view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 })
  await mockPublicApi(page)
  await page.goto("/en/projects")
  await expect(cards(page).nth(2)).not.toBeInViewport()
  await tiles(page).nth(2).click()
  await expect(cards(page).nth(2)).toBeInViewport()
})

test("the strip counts in Russian, runs from the right on /ar, and stands under reduced motion", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/ru/projects")
  await expect(strip(page)).toContainText("3 проекта · 1 в работе")

  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/ar/projects")
  await expect(tiles(page)).toHaveCount(3)
  const [first, last] = await Promise.all([
    tiles(page).nth(0).boundingBox(),
    tiles(page).nth(2).boundingBox(),
  ])
  expect(first!.x).toBeGreaterThan(last!.x)
  await expect(tiles(page).nth(0)).toHaveCSS("opacity", "1")
  await expectNoPageOverflow(page)
})

test("no strip without Projects", async ({ page }) => {
  await mockPublicApi(page, { empty: true })
  await page.goto("/en/projects")
  await expect(page.getByTestId("projects-empty")).toBeVisible()
  await expect(strip(page)).toHaveCount(0)
})

test("a long strip fits 360px: the step shrinks to the content box", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 })
  const [first] = projects("en")
  const many = Array.from({ length: 20 }, (_, i) => ({
    ...first,
    id: i + 1,
    slug: `p${i}`,
    title: `Project ${i}`,
    hasCaseStudy: false,
  }))
  await page.route("**/cdn-cgi/image/**", (route) =>
    route.fulfill({ status: 404 })
  )
  await page.route("**/api/public/**", (route) => route.fulfill({ json: many }))
  await page.goto("/en/projects")
  await expect(tiles(page)).toHaveCount(20)
  const row = await page.locator(".item-strip-row").boundingBox()
  const last = await tiles(page).nth(19).boundingBox()
  expect(last!.x + last!.width).toBeLessThanOrEqual(row!.x + row!.width + 1)
  await expectNoPageOverflow(page)
})
