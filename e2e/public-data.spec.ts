import { expect, test, type Page } from "@playwright/test"

// Issue #65: pages load the Public API through route loaders, against an
// in-memory /api/public/* (the D1 behind `vite preview` is empty). EN has
// every Translation; on RU the second project and the job only have EN.
const technology = {
  id: 1,
  name: "TypeScript",
  category: "frontend",
  icon: null,
}

function project(id: number, slug: string, title: string, fallback = false) {
  return {
    fallback,
    id,
    slug,
    title,
    description: `${title} description`,
    status: "completed",
    coverKey: null,
    githubUrl: null,
    demoUrl: null,
    featured: false,
    inCv: true,
    cvBullets: [],
    hasCaseStudy: id === 1,
    technologies: [technology],
  }
}

function content(lang: string) {
  const ru = lang === "ru"
  return {
    profile: {
      fallback: false,
      name: ru ? "Айбын Серіков" : "Aibyn Serikov",
      headline: ru ? "Веб-разработчик" : "Web developer",
      about: null,
      location: null,
      email: null,
      telegramUrl: null,
      linkedinUrl: null,
      githubUrl: null,
      photoKey: null,
    },
    "cv-sections": [{ type: "experience" }, { type: "projects" }],
    experience: [
      {
        fallback: ru,
        id: 1,
        company: "Acme",
        companyUrl: null,
        role: "Frontend developer",
        location: null,
        startMonth: "2024-01",
        endMonth: null,
        bullets: [],
        technologies: [technology],
      },
    ],
    education: [],
    certifications: [],
    languages: [],
    technologies: [technology],
    projects: [
      project(1, "plotops", ru ? "ПлотОпс" : "PlotOps"),
      project(2, "ams", "AITU AMS", ru),
    ],
  }
}

// Answers like the Worker; returns the paths it was asked for.
async function mockPublicApi(
  page: Page,
  { failFirst = false }: { failFirst?: boolean } = {}
) {
  const asked: string[] = []
  let failing = failFirst

  await page.route("**/api/public/**", (route) => {
    const { pathname } = new URL(route.request().url())
    asked.push(pathname)
    if (failing) {
      failing = false
      return route.abort("internetdisconnected")
    }
    const [, , , lang, entity, slug] = pathname.split("/")
    const data = content(lang)
    if (entity === "projects" && slug) {
      const found = data.projects.find((p) => p.slug === slug)
      return found
        ? route.fulfill({
            json: {
              ...found,
              caseStudy: found.hasCaseStudy
                ? [{ tag: "h2", children: ["Case"] }]
                : null,
            },
          })
        : route.fulfill({ status: 404, json: { error: "not_found" } })
    }
    const body = data[entity as keyof typeof data]
    return body
      ? route.fulfill({ json: body })
      : route.fulfill({ status: 404, json: { error: "not_found" } })
  })
  return asked
}

const notice = (page: Page) => page.getByTestId("fallback-notice")

test("the CV loads on /en without Fallback notices", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en/cv")
  await expect(page.getByText("Aibyn Serikov")).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "Experience" })
  ).toBeVisible()
  await expect(page.getByText("Frontend developer")).toBeVisible()
  await expect(page.getByText("PlotOps", { exact: true })).toBeVisible()
  await expect(notice(page)).toHaveCount(0)
})

test("the CV on /ru marks the entities shown in English", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/ru/cv")
  await expect(page.getByText("Айбын Серіков")).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "Опыт работы" })
  ).toBeVisible()
  // The job and the second project.
  await expect(notice(page)).toHaveCount(2)
  await expect(notice(page).first()).toHaveText("Пока только на английском.")
  await expect(
    page.locator('[lang="en"]', { hasText: "Frontend developer" })
  ).toBeVisible()
})

test("projects load per Lang and link to their Case Study", async ({
  page,
}) => {
  const asked = await mockPublicApi(page)
  await page.goto("/en/projects")
  const list = page.getByRole("main")
  await expect(list.getByRole("heading", { name: "PlotOps" })).toBeVisible()
  await expect(list.getByRole("heading", { name: "AITU AMS" })).toBeVisible()
  await expect(notice(page)).toHaveCount(0)
  // Only the project with a Case Study has a page.
  await expect(list.getByRole("link", { name: "AITU AMS" })).toHaveCount(0)

  await page.getByRole("link", { name: "Русский" }).click()
  await expect(page).toHaveURL(/\/ru\/projects$/)
  await expect(list.getByRole("heading", { name: "ПлотОпс" })).toBeVisible()
  await expect(notice(page)).toHaveCount(1)
  expect(asked).toContain("/api/public/ru/projects")

  await list.getByRole("link", { name: "ПлотОпс" }).click()
  await expect(page).toHaveURL(/\/ru\/projects\/plotops$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "ПлотОпс" })
  ).toBeVisible()
})

test("going back within a minute reuses the loaded data", async ({ page }) => {
  const asked = await mockPublicApi(page)
  await page.goto("/en/projects")
  await expect(page.getByRole("heading", { name: "PlotOps" })).toBeVisible()
  await page.getByRole("link", { name: "PlotOps" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("PlotOps")
  await page.goBack()
  await expect(page.getByRole("heading", { name: "AITU AMS" })).toBeVisible()
  expect(asked.filter((path) => path === "/api/public/en/projects")).toEqual([
    "/api/public/en/projects",
  ])
})

test("an unknown slug or one without a Case Study is a 404", async ({
  page,
}) => {
  await mockPublicApi(page)
  for (const slug of ["nope", "ams"]) {
    await page.goto(`/en/projects/${slug}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" })
    ).toBeVisible()
    await expect(page.getByRole("banner")).toBeVisible()
  }
})

test("a network error offers a retry", async ({ page }) => {
  await mockPublicApi(page, { failFirst: true })
  await page.goto("/de/projects")
  await expect(
    page.getByRole("heading", { level: 1, name: "Projekte" })
  ).toBeVisible()
  await expect(page.getByRole("alert")).toContainText(
    "Die Daten konnten nicht geladen werden."
  )
  await page.getByRole("button", { name: "Erneut versuchen" }).click()
  await expect(page.getByRole("heading", { name: "PlotOps" })).toBeVisible()
  await expect(page.getByRole("alert")).toHaveCount(0)
})
