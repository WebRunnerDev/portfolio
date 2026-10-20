import { expect, test, type Page } from "@playwright/test"

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
            caseStudy: found.hasCaseStudy ? CASE_STUDY : null,
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

  const overflow = await page
    .locator("html")
    .evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBe(0)
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
  await expect(code).toHaveAttribute("dir", "ltr")
  await expect(code).toHaveCSS("direction", "ltr")
  // The long line scrolls inside the block, not the page.
  expect(await code.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true
  )
  const overflow = await page
    .locator("html")
    .evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBe(0)
})
