import { expect, test, type Page } from "@playwright/test"

// The Admin (ADR-0004) against an in-memory /api/admin/*: there is no Access
// in front of `vite preview`, so the real API answers 401 here.
async function mockAdminApi(page: Page) {
  const projects: Record<string, unknown>[] = []
  let nextId = 1

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const path = pathname.replace("/api/admin", "")
    const method = request.method()

    if (path === "/me") {
      return route.fulfill({ json: { email: "owner@example.com" } })
    }
    if (path === "/projects" && method === "GET") {
      return route.fulfill({ json: projects })
    }
    if (path === "/projects" && method === "POST") {
      const body = request.postDataJSON()
      if (projects.some((project) => project.slug === body.slug)) {
        return route.fulfill({
          status: 422,
          json: { error: "validation_failed", fields: { slug: ["Taken"] } },
        })
      }
      const row = {
        id: nextId++,
        status: "in_progress",
        coverKey: null,
        githubUrl: null,
        demoUrl: null,
        featured: false,
        inCv: false,
        technologyIds: [],
        ...body,
        translations: {
          en: { cvBullets: [], caseStudy: null, ...body.translations.en },
        },
      }
      projects.push(row)
      return route.fulfill({ status: 201, json: row })
    }
    const id = Number(path.match(/^\/projects\/(\d+)$/)?.[1])
    if (id && method === "DELETE") {
      projects.splice(
        projects.findIndex((project) => project.id === id),
        1
      )
      return route.fulfill({ status: 204 })
    }
    return route.fulfill({ status: 404, json: { error: "not_found" } })
  })
}

test("public pages load none of the admin code", async ({ page }) => {
  const scripts = new Set<string>()
  page.on("response", (response) => {
    if (response.url().endsWith(".js")) scripts.add(response.url())
  })

  for (const path of ["/en", "/ar/projects"]) {
    await page.goto(path)
    await page.waitForLoadState("networkidle")
  }
  const bodies = await Promise.all(
    [...scripts].map(async (url) => (await page.request.get(url)).text())
  )
  expect(bodies.length).toBeGreaterThan(0)
  for (const body of bodies) expect(body).not.toContain("/api/admin")

  // …which /admin then loads.
  scripts.clear()
  await page.goto("/admin")
  await page.waitForLoadState("networkidle")
  const adminBodies = await Promise.all(
    [...scripts].map(async (url) => (await page.request.get(url)).text())
  )
  expect(adminBodies.some((body) => body.includes("/api/admin"))).toBe(true)
})

test("admin is EN, LTR and noindex after an RTL page", async ({ page }) => {
  await mockAdminApi(page)
  await page.goto("/ar")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")

  await page.goto("/admin")
  await expect(page.getByTestId("admin-email")).toHaveText("owner@example.com")
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr")
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/
  )
})

test("admin lists, creates and deletes projects", async ({ page }) => {
  await mockAdminApi(page)
  await page.goto("/admin")
  await page
    .getByRole("navigation", { name: "Content" })
    .getByRole("link", { name: "Projects" })
    .click()
  await expect(page.getByText("No projects yet.")).toBeVisible()

  // Checked in the browser before the request.
  await page.getByRole("button", { name: "New project" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(dialog.getByText("Required")).toHaveCount(3)

  await dialog.getByLabel("Title").fill("PlotOps")
  await dialog.getByLabel("Slug").fill("plotops")
  await dialog.getByLabel("Description").fill("Field planning")
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(dialog).toBeHidden()
  const row = page.getByRole("row", { name: /PlotOps/ })
  await expect(row).toContainText("plotops")
  await expect(row).toContainText("in progress")

  // A 422 from the API lands on its field.
  await page.getByRole("button", { name: "New project" }).click()
  await dialog.getByLabel("Title").fill("Copy")
  await dialog.getByLabel("Slug").fill("plotops")
  await dialog.getByLabel("Description").fill("Same slug")
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(dialog.getByText("Taken")).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel" }).click()

  await row.getByRole("button", { name: "Delete PlotOps" }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click()
  await expect(page.getByText("No projects yet.")).toBeVisible()
})
