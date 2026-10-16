import { expect, test } from "@playwright/test"

// The Admin editor against the real Worker: `vite dev` with a fresh local D1
// and R2, Access passed by ACCESS_DEV_EMAIL (scripts/e2e-dev.mjs). Runs in the
// `dev` project of playwright.config.ts.

// A 2×1 PNG.
const COVER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAD0lEQVR4nGP4z8DAwPAfAAcAAf9+CLHQAAAAAElFTkSuQmCC",
  "base64"
)

test("creates a project with EN and RU Translations and a cover", async ({
  page,
  request,
}) => {
  const slug = `plotops-${Date.now()}`
  await page.goto("/admin/projects")
  await page.getByRole("button", { name: "New project" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Title").fill("PlotOps")
  await dialog.getByLabel("Slug").fill(slug)
  await dialog.getByLabel("Description").fill("Field planning")
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(dialog).toBeHidden()
  await page
    .getByRole("row", { name: new RegExp(slug) })
    .getByRole("link", { name: "PlotOps" })
    .click()
  await expect(page.getByRole("heading", { name: "PlotOps" })).toBeVisible()

  // The cover: uploaded at once, previewed, saved with the fields.
  const fields = page.getByRole("region", { name: "Fields" })
  await fields.getByLabel("Cover").setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: COVER,
  })
  const preview = fields.getByRole("img", { name: "Preview" })
  await expect(preview).toBeVisible()
  await expect
    .poll(() =>
      preview.evaluate((img) => (img as { naturalWidth: number }).naturalWidth)
    )
    .toBe(2)
  await expect(fields.getByText("Unsaved changes")).toBeVisible()
  await fields.getByRole("button", { name: "Save fields" }).click()
  await expect(fields.getByText("Saved", { exact: true })).toBeVisible()

  // EN came from the create form; RU is typed on its tab.
  await expect(page.getByTestId("completeness-en")).toHaveText("2/4")
  await expect(page.getByTestId("completeness-ru")).toHaveText("0/4")
  await page.getByRole("tab", { name: /^ru/ }).click()
  const panel = page.getByRole("tabpanel")
  await panel.getByLabel("Title").fill("ПлотОпс")
  await panel.getByLabel("Description").fill("Планирование полей")
  await expect(page.getByTestId("completeness-ru")).toHaveText("2/4")
  await panel.getByRole("button", { name: "Save RU" }).click()
  await expect(panel.getByText("Saved", { exact: true })).toBeVisible()

  // AR is typed right to left.
  await page.getByRole("tab", { name: /^ar/ }).click()
  await expect(panel.getByLabel("Title")).toHaveAttribute("dir", "rtl")

  // The public API answers with the changes; DE falls back to EN.
  const read = async (lang: string) => {
    const response = await request.get(`/api/public/${lang}/projects/${slug}`)
    expect(response.status()).toBe(200)
    return response.json()
  }
  const en = await read("en")
  expect(en).toMatchObject({ title: "PlotOps", fallback: false })
  expect(en.coverKey).toMatch(/^image\/.+\.png$/)
  expect(await read("ru")).toMatchObject({
    title: "ПлотОпс",
    description: "Планирование полей",
    fallback: false,
  })
  expect(await read("de")).toMatchObject({ title: "PlotOps", fallback: true })
  expect((await request.get(`/media/${en.coverKey}`)).status()).toBe(200)

  // Leaving with unsaved changes asks first.
  await page.getByRole("tab", { name: /^de/ }).click()
  await panel.getByLabel("Title").fill("PlotOps DE")
  await page.getByRole("link", { name: "Projects" }).first().click()
  const confirm = page.getByRole("alertdialog")
  await expect(confirm).toContainText("DE")
  await confirm.getByRole("button", { name: "Stay" }).click()
  await expect(panel.getByLabel("Title")).toHaveValue("PlotOps DE")
  await page.getByRole("link", { name: "Projects" }).first().click()
  await confirm.getByRole("button", { name: "Discard changes" }).click()
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible()
})
