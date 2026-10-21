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

// Issue #68: generate or upload the CV PDF of each Lang.
test("admin generates and uploads the CV PDF by Lang", async ({ page }) => {
  await mockAdminApi(page)
  const pdfs: { lang: string; generatedAt: string }[] = [
    { lang: "en", generatedAt: "2026-10-19T09:30:00.000Z" },
  ]
  // Registered last, so it answers /cv-pdf before mockAdminApi does.
  await page.route("**/api/admin/cv-pdf**", async (route) => {
    const request = route.request()
    const lang = new URL(request.url()).pathname.split("/")[4]
    if (request.method() === "GET") return route.fulfill({ json: pdfs })
    // Locally without Chrome, or over Browser Rendering's limits.
    if (lang === "de") {
      return route.fulfill({
        status: 503,
        json: { error: "browser_unavailable" },
      })
    }
    const row = { lang, generatedAt: "2026-10-20T10:00:00.000Z" }
    pdfs.push(row)
    return route.fulfill({ json: row })
  })

  await page.goto("/admin")
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "CV PDF" })
    .click()
  await expect(page.getByRole("heading", { name: "CV PDF" })).toBeVisible()

  const en = page.getByTestId("cv-pdf-en")
  await expect(en.getByRole("link", { name: "/en/cv.pdf" })).toBeVisible()
  const ru = page.getByTestId("cv-pdf-ru")
  await expect(ru.getByRole("link", { name: "/ru/cv.pdf" })).toHaveCount(0)

  await ru.getByRole("button", { name: "Generate" }).click()
  await expect(ru.getByRole("link", { name: "/ru/cv.pdf" })).toBeVisible()
  await expect(ru.locator("time")).toHaveAttribute(
    "datetime",
    "2026-10-20T10:00:00.000Z"
  )

  const de = page.getByTestId("cv-pdf-de")
  await de.getByRole("button", { name: "Generate" }).click()
  await expect(de).toContainText("No browser")

  const kk = page.getByTestId("cv-pdf-kk")
  await kk.getByLabel("Upload a PDF by hand (KK)").setInputFiles({
    name: "cv.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\n"),
  })
  await expect(kk.getByRole("link", { name: "/kk/cv.pdf" })).toBeVisible()
})

// Issue #84: many photos into an album at once.
test("admin uploads 50+ photos into an album", async ({ page }) => {
  const photos: Record<string, unknown>[] = []
  let inFlight = 0
  let maxInFlight = 0
  let refuseBad = true

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request()
    const { pathname, searchParams } = new URL(request.url())
    const path = pathname.replace("/api/admin", "")
    const method = request.method()

    if (path === "/me") {
      return route.fulfill({ json: { email: "owner@example.com" } })
    }
    if (path === "/albums/1") {
      return route.fulfill({
        json: {
          id: 1,
          slug: "trips",
          coverKey: null,
          translations: { en: { title: "Trips" } },
        },
      })
    }
    // The file says the size the Worker would read from it: `640x480`.
    if (path === "/uploads" && method === "POST") {
      const body = request.postDataBuffer()!.toString()
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 30))
      inFlight--
      if (body === "bad" && refuseBad) {
        return route.fulfill({
          status: 415,
          json: { error: "unsupported_media_type" },
        })
      }
      const [width, height] = body === "bad" ? [1, 1] : body.split("x")
      return route.fulfill({
        status: 201,
        json: {
          key: `image/${crypto.randomUUID()}.jpg`,
          contentType: "image/jpeg",
          size: body.length,
          width: Number(width),
          height: Number(height),
        },
      })
    }
    if (path === "/photos" && method === "GET") {
      expect(searchParams.get("albumId")).toBe("1")
      return route.fulfill({ json: photos })
    }
    if (path === "/photos" && method === "POST") {
      const row = {
        id: photos.length + 1,
        translations: {},
        ...request.postDataJSON(),
      }
      photos.push(row)
      return route.fulfill({ status: 201, json: row })
    }
    return route.fulfill({ status: 404, json: { error: "not_found" } })
  })

  await page.goto("/admin/albums/1")
  const section = page.getByRole("region", { name: "Photos" })
  await expect(section.getByText("No photos yet.")).toBeVisible()

  const files = Array.from({ length: 52 }, (_, index) => ({
    name: `photo-${index}.jpg`,
    mimeType: "image/jpeg",
    buffer: Buffer.from(`${100 + index}x${200 + index}`),
  }))
  files.splice(10, 0, {
    name: "notes.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("bad"),
  })
  await section.getByLabel("Add photos").setInputFiles(files)

  const status = section.getByText(/^Uploaded \d+ of \d+\./)
  await expect(status).toHaveText("Uploaded 52 of 53. Failed: 1.", {
    timeout: 30_000,
  })
  expect(maxInFlight).toBeLessThanOrEqual(3)
  const failed = section.locator('li[data-status="failed"]')
  await expect(failed).toContainText("notes.jpg")
  await expect(failed).toContainText("This file type isn't allowed.")

  // Every photo has its own size, in the order the files were chosen.
  expect(photos).toHaveLength(52)
  photos.forEach((photo, index) => {
    expect(photo).toMatchObject({
      albumId: 1,
      width: 100 + index,
      height: 200 + index,
    })
  })
  await expect(section.getByRole("row")).toHaveCount(53)

  refuseBad = false
  await failed.getByRole("button", { name: "Retry notes.jpg" }).click()
  await expect(status).toHaveText("Uploaded 53 of 53.")
  await expect(section.getByRole("row")).toHaveCount(54)

  await section.getByRole("button", { name: "Clear finished" }).click()
  await expect(section.getByRole("list", { name: "Uploads" })).toHaveCount(0)

  // Dropped files go the same way.
  // A string: e2e/ is type-checked without the DOM lib.
  const dataTransfer = await page.evaluateHandle(`(() => {
    const data = new DataTransfer()
    data.items.add(new File(["300x400"], "dropped.jpg", { type: "image/jpeg" }))
    return data
  })()`)
  await section.getByTestId("drop-zone").dispatchEvent("drop", { dataTransfer })
  await expect(status).toHaveText("Uploaded 1 of 1.")
  expect(photos.at(-1)).toMatchObject({ width: 300, height: 400 })
})

// Issue #85: the order of an album's photos by dragging, and its cover.
test("admin reorders an album's photos and picks its cover", async ({
  page,
}) => {
  const photos = [1, 2, 3].map((id) => ({
    id,
    albumId: 1,
    r2Key: `image/${id}.jpg`,
    width: 10,
    height: 10,
    translations: { en: { caption: `Photo ${id}` } },
  }))
  const album = {
    id: 1,
    slug: "trips",
    coverKey: null as string | null,
    translations: { en: { title: "Trips" } },
  }
  const orders: number[][] = []

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace("/api/admin", "")
    const method = request.method()
    if (path === "/me") {
      return route.fulfill({ json: { email: "owner@example.com" } })
    }
    if (path === "/albums/1" && method === "PATCH") {
      Object.assign(album, request.postDataJSON())
    }
    if (path === "/albums/1") return route.fulfill({ json: album })
    if (path === "/photos/order" && method === "PUT") {
      const { ids } = request.postDataJSON() as { ids: number[] }
      orders.push(ids)
      photos.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
      return route.fulfill({ status: 204 })
    }
    if (path === "/photos") return route.fulfill({ json: photos })
    return route.fulfill({ status: 404, json: { error: "not_found" } })
  })

  // Tall enough for no scrolling: a keyboard move near an edge scrolls the
  // page first.
  await page.setViewportSize({ width: 1280, height: 2000 })
  await page.goto("/admin/albums/1")
  const section = page.getByRole("region", { name: "Photos" })
  const titles = section.getByRole("row").getByRole("link")
  await expect(titles).toHaveText(["Photo 1", "Photo 2", "Photo 3"])

  // Keyboard: Space picks up, an arrow moves, Space drops.
  await section.getByRole("button", { name: "Move Photo 1" }).focus()
  const live = page.locator("[aria-live]", { hasText: "Photo 1" })
  await page.keyboard.press("Space")
  await expect(live).toHaveText(/position 1 of 3/)
  // The rows are measured a moment after the pick-up; an arrow before that
  // does nothing.
  await expect(async () => {
    await page.keyboard.press("ArrowDown")
    await expect(live).toHaveText(/Photo 1 is now at position 2 of 3/, {
      timeout: 250,
    })
  }).toPass()
  await page.keyboard.press("Space")
  await expect(titles).toHaveText(["Photo 2", "Photo 1", "Photo 3"])
  expect(orders.at(-1)).toEqual([2, 1, 3])

  // Mouse: Photo 3 dragged to the top.
  const handle = section.getByRole("button", { name: "Move Photo 3" })
  const target = section.getByRole("button", { name: "Move Photo 2" })
  const from = (await handle.boundingBox())!
  const to = (await target.boundingBox())!
  const x = from.x + from.width / 2
  await page.mouse.move(x, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(x, from.y, { steps: 5 })
  const dragged = page.locator("[aria-live]", { hasText: "Photo 3" })
  await expect(dragged).toHaveText(/position 3 of 3/)
  await expect(async () => {
    await page.mouse.move(x, to.y, { steps: 5 })
    await expect(dragged).toHaveText(/position 1 of 3/, { timeout: 250 })
  }).toPass()
  await page.mouse.up()
  await expect(titles).toHaveText(["Photo 3", "Photo 2", "Photo 1"])
  expect(orders.at(-1)).toEqual([3, 2, 1])

  // The cover: one of the album's photos; none chosen means the first.
  const fields = page.getByRole("region", { name: "Fields" })
  const cover = fields.getByRole("group", { name: "Cover" })
  await expect(cover.getByText("None chosen: the first photo")).toBeVisible()
  await cover.getByRole("radio", { name: "Photo 2" }).click()
  await fields.getByRole("button", { name: "Save fields" }).click()
  await expect(fields.getByText("Saved")).toBeVisible()
  expect(album.coverKey).toBe("image/2.jpg")
})
