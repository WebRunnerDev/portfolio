import { expect, test, type Page } from "@playwright/test"

// Issue #66: the Web CV, against an in-memory /api/public/* (the D1 behind
// `vite preview` is empty). `cv-sections` answers what D1 has with
// `show_web = 1`, in order: Education is left out, though it has entries.
const PHONE = "+7 701 000 00 00"

const technology = (id: number, name: string, category: string) => ({
  id,
  name,
  category,
  icon: null,
})

const react = technology(1, "React", "frontend")
const hono = technology(2, "Hono", "backend_cloud")

const DATA = {
  profile: {
    fallback: false,
    name: "Zhasulan Abdigaliyev",
    headline: "Frontend developer",
    about: null,
    location: "Astana",
    email: "me@example.com",
    telegramUrl: "https://t.me/me",
    linkedinUrl: "https://www.linkedin.com/in/me",
    githubUrl: "https://github.com/me",
    photoKey: null,
    // The API never sends one; the client must drop it if it does.
    phone: PHONE,
  },
  "cv-sections": [
    { type: "technologies" },
    { type: "experience" },
    { type: "projects" },
    { type: "languages" },
  ],
  experience: [
    {
      fallback: false,
      id: 1,
      company: "Acme",
      companyUrl: "https://acme.example",
      role: "Frontend developer",
      location: null,
      startMonth: "2024-01",
      endMonth: null,
      bullets: ["Built the dashboard"],
      technologies: [react],
    },
    {
      fallback: false,
      id: 2,
      company: "Globex",
      companyUrl: null,
      role: "Intern",
      location: null,
      startMonth: "2022-03",
      endMonth: "2023-12",
      bullets: [],
      technologies: [],
    },
  ],
  projects: [
    {
      fallback: false,
      id: 1,
      slug: "plotops",
      title: "PlotOps",
      description: "Field operations",
      status: "completed",
      coverKey: null,
      githubUrl: "https://github.com/me/plotops",
      demoUrl: null,
      featured: false,
      inCv: true,
      cvBullets: ["Offline sync"],
      hasCaseStudy: true,
      technologies: [react, hono],
    },
    {
      fallback: false,
      id: 2,
      slug: "hidden",
      title: "Not in the CV",
      description: "",
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
  ],
  technologies: [react, hono],
  education: [
    {
      fallback: false,
      id: 1,
      institution: "Nazarbayev University",
      degree: "BSc",
      diploma: null,
      gpa: null,
      startMonth: "2019-09",
      endMonth: "2023-06",
    },
  ],
  certifications: [],
  languages: [
    { fallback: false, id: 1, code: "kk", name: "Kazakh", level: "Native" },
  ],
}

async function mockPublicApi(page: Page) {
  await page.route("**/api/public/**", (route) => {
    const entity = new URL(route.request().url()).pathname.split("/")[4]
    const body = DATA[entity as keyof typeof DATA]
    return body
      ? route.fulfill({ json: body })
      : route.fulfill({ status: 404, json: { error: "not_found" } })
  })
}

const sectionTitles = (page: Page) =>
  page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents()

test("the CV shows the sections in the order of D1", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/en/cv")
  await expect(
    page.getByRole("heading", { level: 1, name: "Zhasulan Abdigaliyev" })
  ).toBeVisible()
  await expect(page).toHaveTitle("Zhasulan Abdigaliyev: CV · WebRunner")
  expect(await sectionTitles(page)).toEqual([
    "Technologies",
    "Experience",
    "Projects",
    "Languages",
  ])
  await expect(page.getByText("Nazarbayev University")).toHaveCount(0)
  await expect(page.getByText("Not in the CV")).toHaveCount(0)
})

test("the CV header has the Profile's contacts and no phone", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en/cv")
  const contacts = page
    .getByRole("main")
    .getByRole("list", { name: "Contacts" })
  await expect(contacts.getByRole("link")).toHaveText([
    "me@example.com",
    "Telegram",
    "LinkedIn",
    "GitHub",
  ])
  await expect(
    contacts.getByRole("link", { name: "me@example.com" })
  ).toHaveAttribute("href", "mailto:me@example.com")
  expect(await page.content()).not.toContain(PHONE)
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0)
})

test("entries show their dates and group the technologies", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/en/cv")
  const experience = page.getByRole("region", { name: "Experience" })
  await expect(experience.getByRole("listitem").first()).toContainText(
    "Jan 2024 – Present"
  )
  await expect(experience).toContainText("Mar 2022 – Dec 2023")
  await expect(experience.locator("time").first()).toHaveAttribute(
    "datetime",
    "2024-01"
  )
  const technologies = page.getByRole("region", { name: "Technologies" })
  await expect(technologies.getByRole("heading", { level: 3 })).toHaveText([
    "Front-End",
    "Back-End & Cloud",
  ])
  await page
    .getByRole("region", { name: "Projects" })
    .getByRole("link", { name: "PlotOps" })
    .click()
  await expect(page).toHaveURL(/\/en\/projects\/plotops$/)
})

test("dates use the Lang, with Western digits on /ar", async ({ page }) => {
  await mockPublicApi(page)
  await page.goto("/ru/cv")
  await expect(page.getByRole("region", { name: "Опыт работы" })).toContainText(
    "по настоящее время"
  )
  await page.goto("/ar/cv")
  const time = page.getByRole("main").locator("time").first()
  await expect(time).toContainText("2024")
})

test("/ar mirrors the CV: the date column is on the right", async ({
  page,
}) => {
  await mockPublicApi(page)
  await page.goto("/ar/cv")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  const entry = page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Intern" }) })
  const date = (await entry.locator("time").first().boundingBox())!
  const title = (await entry.getByRole("heading").boundingBox())!
  expect(date.x).toBeGreaterThan(title.x + title.width)
})

test("the CV fits 360px in LTR and RTL", async ({ page }) => {
  await mockPublicApi(page)
  await page.setViewportSize({ width: 360, height: 800 })
  for (const lang of ["de", "ar"]) {
    await page.goto(`/${lang}/cv`)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    const overflow = await page
      .locator("html")
      .evaluate(
        (el: { scrollWidth: number; clientWidth: number }) =>
          el.scrollWidth - el.clientWidth
      )
    expect(overflow).toBeLessThanOrEqual(0)
  }
})
