import { expect, test } from "@playwright/test"

// The Admin editor against the real Worker: `vite dev` with a fresh local D1
// and R2, Access passed by ACCESS_DEV_EMAIL (scripts/e2e-dev.mjs). Runs in the
// `dev` project of playwright.config.ts.

// A 2×1 PNG.
const COVER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAD0lEQVR4nGP4z8DAwPAfAAcAAf9+CLHQAAAAAElFTkSuQmCC",
  "base64"
)

// `seconds` of silent MP3: MPEG-1 Layer III frames at 128 kbps and 44.1 kHz,
// 417 bytes and 1152 samples each, all zero after the header.
function silentMp3(seconds: number) {
  const frames = Math.round((seconds * 44100) / 1152)
  const mp3 = Buffer.alloc(frames * 417)
  for (let i = 0; i < frames; i++) mp3.writeUInt32BE(0xfffb9000, i * 417)
  return mp3
}

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

test("writes, tags, translates and publishes a post on its own page", async ({
  page,
  request,
}) => {
  const slug = `edge-notes-${Date.now()}`
  const tagSlug = `cloud-native-${Date.now()}`
  const listed = async (lang: string) => {
    const response = await request.get(`/api/public/${lang}/posts`)
    expect(response.status()).toBe(200)
    const posts: { slug: string }[] = await response.json()
    return posts.find((post) => post.slug === slug)
  }

  await page.goto("/admin/posts")
  await page.getByRole("button", { name: "New post" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Title").fill("Edge notes")
  await dialog.getByLabel("Slug").fill(slug)
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(dialog).toBeHidden()
  await page
    .getByRole("row", { name: new RegExp(slug) })
    .getByRole("link", { name: "Edge notes" })
    .click()
  await expect(page.getByTestId("publish-status")).toHaveText("Draft")

  // A new tag, created right here, its slug following the name.
  const fields = page.getByRole("region", { name: "Fields" })
  await fields.getByLabel("New tag name").fill("Cloud Native")
  await expect(fields.getByLabel("New tag slug")).toHaveValue("cloud-native")
  await fields.getByLabel("New tag slug").fill(tagSlug)
  await fields.getByRole("button", { name: "Add tag" }).click()
  await expect(fields.getByLabel("Cloud Native")).toBeChecked()
  await expect(fields.getByLabel("New tag name")).toHaveValue("")
  await fields.getByRole("button", { name: "Save fields" }).click()
  await expect(fields.getByText("Saved", { exact: true })).toBeVisible()

  // The preview follows the Markdown as it is typed.
  const panel = page.getByRole("tabpanel")
  const preview = panel.getByRole("region", { name: "Preview" })
  await expect(preview).toContainText("Nothing to preview yet.")
  const words = Array(250).fill("word").join(" ")
  await panel
    .getByLabel("Body")
    .fill(`# Hello edge\n\nSome **bold** text.\n\n${words}`)
  await expect(
    preview.getByRole("heading", { name: "Hello edge" })
  ).toBeVisible()
  await expect(preview.locator("strong")).toHaveText("bold")
  await panel.getByRole("button", { name: "Save EN" }).click()
  await expect(panel.getByText("Saved", { exact: true })).toBeVisible()

  await page.getByRole("tab", { name: /^ru/ }).click()
  await panel.getByLabel("Title").fill("Заметки о краю")
  await panel.getByLabel("Body").fill("Коротко.")
  await expect(preview).toContainText("Коротко.")
  await panel.getByRole("button", { name: "Save RU" }).click()
  await expect(panel.getByText("Saved", { exact: true })).toBeVisible()

  // A draft is not public; publishing makes it so, unpublishing hides it.
  expect(await listed("en")).toBeUndefined()
  await page.getByRole("button", { name: "Publish" }).click()
  await expect(page.getByTestId("publish-status")).toHaveText(/^Published, /)
  expect(await listed("en")).toMatchObject({
    title: "Edge notes",
    readingMinutes: 2,
    tags: [{ slug: tagSlug, name: "Cloud Native" }],
    fallback: false,
  })
  expect(await listed("ru")).toMatchObject({
    title: "Заметки о краю",
    readingMinutes: 1,
  })
  await page.getByRole("button", { name: "Unpublish" }).click()
  await expect(page.getByTestId("publish-status")).toHaveText("Draft")
  expect(await listed("en")).toBeUndefined()

  // Below lg the text and the preview take turns.
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(panel.getByLabel("Body")).toBeVisible()
  await expect(preview).toBeHidden()
  await panel.getByRole("radio", { name: "Preview" }).click()
  await expect(preview).toBeVisible()
  await expect(panel.getByLabel("Body")).toBeHidden()
})

test("drops and pastes images into a post's body", async ({ page }) => {
  const slug = `pictures-${Date.now()}`
  await page.goto("/admin/posts")
  await page.getByRole("button", { name: "New post" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Title").fill("Pictures")
  await dialog.getByLabel("Slug").fill(slug)
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(dialog).toBeHidden()
  await page
    .getByRole("row", { name: new RegExp(slug) })
    .getByRole("link", { name: "Pictures" })
    .click()

  const panel = page.getByRole("tabpanel")
  const body = panel.getByLabel("Body")
  const preview = panel.getByRole("region", { name: "Preview" })
  // A DataTransfer of `name:type:bytes` files, `png` for a real one. Strings:
  // e2e/ is type-checked without the DOM lib.
  const transfer = (...entries: string[]) => `(() => {
      const png = Uint8Array.from(atob("${COVER.toString("base64")}"), (c) => c.charCodeAt(0))
      const data = new DataTransfer()
      for (const [name, type, bytes] of ${JSON.stringify(entries.map((entry) => entry.split(":")))}) {
        data.items.add(new File([bytes === "png" ? png : bytes], name, { type }))
      }
      return data
    })()`
  const files = (...entries: string[]) =>
    page.evaluateHandle(transfer(...entries))
  const image = /!\[\]\(\/media\/image\/[^)]+\.png\)/

  // Dropped at the caret; the caret ends up in the alt text.
  await body.fill("Intro\n\n")
  await body.dispatchEvent("drop", {
    dataTransfer: await files("cat.png:image/png:png"),
  })
  await expect(body).toHaveValue(new RegExp(`^Intro\n\n${image.source}$`))
  await page.keyboard.type("A cat")
  await expect(body).toHaveValue(/^Intro\n\n!\[A cat\]\(\/media\/image\//)
  await expect(preview.getByRole("img", { name: "A cat" })).toHaveAttribute(
    "srcset",
    /\/media\/image\/.+\.png 1920w/
  )

  // Pasted: two at once, both in the text.
  await body.press("End")
  await body.press("Enter")
  // Playwright's own paste event has no clipboardData.
  await page.evaluate(`document.activeElement.dispatchEvent(
    new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: ${transfer("a.png:image/png:png", "b.png:image/png:png")},
    })
  )`)
  await expect
    .poll(async () => (await body.inputValue()).match(/\/media\/image\//g))
    .toHaveLength(3)
  expect(await body.inputValue()).not.toContain("Uploading")

  // A file the Worker refuses, and one that isn't an image: an error each,
  // the text as it was.
  const before = await body.inputValue()
  await body.dispatchEvent("drop", {
    dataTransfer: await files(
      "fake.png:image/png:not a png",
      "notes.txt:text/plain:hello"
    ),
  })
  const errors = panel.getByRole("alert", { name: "Image errors" })
  await expect(errors).toContainText("fake.png: This file type isn't allowed.")
  await expect(errors).toContainText("notes.txt: Only images go here.")
  await expect(body).toHaveValue(before)
  await errors.getByRole("button", { name: "Dismiss notes.txt" }).click()
  await expect(errors).not.toContainText("notes.txt")

  await panel.getByRole("button", { name: "Save EN" }).click()
  await expect(panel.getByText("Saved", { exact: true })).toBeVisible()
})

test("uploads a Track that the music player then plays", async ({
  page,
  request,
}) => {
  const title = `Graphite ${Date.now()}`
  await page.goto("/admin/tracks")
  await page.getByRole("button", { name: "New track" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Title").fill(title)
  await dialog.getByLabel("Artist").fill("Lowlands")
  await dialog.getByLabel("Source").fill("https://pixabay.com/music/")
  await dialog.getByLabel("License").fill("Pixabay Content License")
  await dialog.getByLabel("File").setInputFiles({
    name: "graphite.mp3",
    mimeType: "audio/mpeg",
    buffer: silentMp3(3),
  })
  // The length comes from the file.
  await expect(dialog.getByLabel("Length, seconds")).toHaveValue("3")
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page.getByRole("row", { name: new RegExp(title) })
  ).toContainText("0:03")

  const tracks = await (await request.get("/api/public/en/tracks")).json()
  const track = tracks.find((track: { title: string }) => track.title === title)
  expect(track).toMatchObject({ artist: "Lowlands", durationSeconds: 3 })
  expect(track.key).toMatch(/^audio\/.+\.mp3$/)

  // The public site plays it from R2.
  await page.goto("/en")
  await page
    .getByTestId("music-player")
    .getByRole("button", { name: "Music" })
    .click()
  const panel = page.getByTestId("player-panel")
  await panel.getByRole("button", { name: new RegExp(title) }).click()
  await expect(panel.getByRole("button", { name: "Pause" })).toBeVisible()
  await expect
    .poll(() => page.evaluate("document.querySelector('audio').currentTime"))
    .toBeGreaterThan(0)
})
