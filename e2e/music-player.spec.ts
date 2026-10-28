import { expect, test, type Page } from "@playwright/test"

// Issue #120: the music player in the layout, outside the <Outlet>. Against
// an in-memory /api/public/* with two Tracks; /media/* answers a silent WAV,
// so the audio really plays.
const TRACKS = [
  {
    id: 1,
    title: "Graphite",
    artist: "Lowlands",
    source: "https://pixabay.com/music/graphite/",
    license: "Pixabay Content License",
    key: "audio/graphite.mp3",
    durationSeconds: 20,
  },
  {
    id: 2,
    title: "Rust",
    artist: "Dune Theory",
    source: "Pixabay Music",
    license: "Pixabay Content License",
    key: "audio/rust.mp3",
    durationSeconds: 20,
  },
]

// 20 s of 8-bit mono silence at 8 kHz.
function silentWav(seconds = 20, rate = 8000) {
  const samples = seconds * rate
  const wav = Buffer.alloc(44 + samples, 128)
  wav.write("RIFF", 0)
  wav.writeUInt32LE(36 + samples, 4)
  wav.write("WAVEfmt ", 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(rate, 24)
  wav.writeUInt32LE(rate, 28)
  wav.writeUInt16LE(1, 32)
  wav.writeUInt16LE(8, 34)
  wav.write("data", 36)
  wav.writeUInt32LE(samples, 40)
  return wav
}

// The URLs of /media/* the page asked for.
async function mockApi(page: Page, { tracks = TRACKS } = {}) {
  const media: string[] = []
  const wav = silentWav()
  await page.route("**/api/public/**", (route) => {
    const entity = new URL(route.request().url()).pathname.split("/")[4]
    return entity === "tracks"
      ? route.fulfill({ json: tracks })
      : route.fulfill({ status: 404, json: { error: "not_found" } })
  })
  await page.route("**/media/**", (route) => {
    media.push(route.request().url())
    return route.fulfill({ contentType: "audio/wav", body: wav })
  })
  return media
}

const playerButton = (page: Page, name = "Music") =>
  page.getByTestId("music-player").getByRole("button", { name })

async function openPanel(page: Page) {
  await playerButton(page).click()
  const panel = page.getByTestId("player-panel")
  await expect(panel).toBeVisible()
  return panel
}

const audioState = (page: Page) =>
  page.locator("audio").evaluate((element) => {
    const audio = element as unknown as {
      paused: boolean
      currentTime: number
      preload: string
    }
    return {
      paused: audio.paused,
      time: audio.currentTime,
      src: element.getAttribute("src"),
      preload: audio.preload,
    }
  })

test("nothing of the audio loads before play", async ({ page }) => {
  const media = await mockApi(page)
  await page.goto("/en/projects")
  const panel = await openPanel(page)
  await expect(panel).toContainText("Graphite")
  expect(await audioState(page)).toMatchObject({
    paused: true,
    src: null,
    preload: "none",
  })
  expect(media).toEqual([])

  await panel.getByRole("button", { name: "Play" }).click()
  await expect(panel.getByRole("button", { name: "Pause" })).toBeVisible()
  expect(media).toEqual([expect.stringContaining("/media/audio/graphite.mp3")])
})

test("the music plays on across a page change", async ({ page }) => {
  await mockApi(page)
  await page.goto("/en/projects")
  const panel = await openPanel(page)
  await panel.getByRole("button", { name: "Play" }).click()
  await expect
    .poll(async () => (await audioState(page)).time)
    .toBeGreaterThan(0)
  await page.evaluate("window.playerAudio = document.querySelector('audio')")
  await page.keyboard.press("Escape")

  await page.getByRole("link", { name: "WebRunner, Home" }).click()
  await expect(page).toHaveURL(/\/en$/)
  const before = (await audioState(page)).time
  // The same element: the player wasn't mounted again.
  expect(
    await page.evaluate(
      "document.querySelector('audio') === window.playerAudio"
    )
  ).toBe(true)
  await expect
    .poll(async () => (await audioState(page)).time)
    .toBeGreaterThan(before)
  expect((await audioState(page)).paused).toBe(false)
  await expect(playerButton(page)).toHaveAttribute("data-playing", "true")
})

test("the volume and the last Track outlive a reload", async ({ page }) => {
  await mockApi(page)
  await page.goto("/en")
  let panel = await openPanel(page)
  const volume = panel.getByRole("slider", { name: "Volume" })
  await volume.focus()
  await page.keyboard.press("Home")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  await expect(volume).toHaveAttribute("aria-valuenow", "10")
  await panel.getByRole("button", { name: /Rust/ }).click()
  await expect(panel.getByRole("button", { name: /Rust/ })).toHaveAttribute(
    "aria-current",
    "true"
  )
  expect(
    await page.evaluate("document.querySelector('audio').volume")
  ).toBeCloseTo(0.1)

  await page.reload()
  panel = await openPanel(page)
  await expect(panel.getByRole("slider", { name: "Volume" })).toHaveAttribute(
    "aria-valuenow",
    "10"
  )
  await expect(panel.getByRole("button", { name: /Rust/ })).toHaveAttribute(
    "aria-current",
    "true"
  )
  // Remembered, but still not started on its own.
  expect((await audioState(page)).paused).toBe(true)
})

test("prev and next go round the playlist; the lock screen shows the Track", async ({
  page,
}) => {
  await mockApi(page)
  await page.goto("/en")
  const panel = await openPanel(page)
  await panel.getByRole("button", { name: "Previous track" }).click()
  await expect(panel.getByRole("button", { name: /Rust/ })).toHaveAttribute(
    "aria-current",
    "true"
  )
  await expect
    .poll(() => page.evaluate("navigator.mediaSession.metadata?.title ?? null"))
    .toBe("Rust")
  await panel.getByRole("button", { name: "Next track" }).click()
  await expect
    .poll(() =>
      page.evaluate("navigator.mediaSession.metadata?.artist ?? null")
    )
    .toBe("Lowlands")
})

test("the panel credits each Track, its link source in a new tab", async ({
  page,
}) => {
  await mockApi(page)
  await page.goto("/en")
  const panel = await openPanel(page)
  const link = panel.getByRole("link", { name: "pixabay.com" })
  await expect(link).toHaveAttribute("target", "_blank")
  await expect(panel).toContainText("Pixabay Music · Pixabay Content License")
})

test("no Tracks, no player", async ({ page }) => {
  await mockApi(page, { tracks: [] })
  await page.goto("/en")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByTestId("music-player")).toHaveCount(0)
})

test("on /ar the player stays in the bottom right corner", async ({ page }) => {
  await mockApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/ar")
  const player = page.getByTestId("music-player")
  await expect(player).toHaveAttribute("dir", "ltr")
  const box = (await playerButton(page, "الموسيقى").boundingBox())!
  expect(box.x + box.width).toBeGreaterThan(390 - 24)
  expect(box.y + box.height).toBeGreaterThan(844 - 24)
  await expect(playerButton(page, "الموسيقى")).toHaveCSS(
    "view-transition-name",
    "none"
  )
  await expect(player).toHaveCSS("view-transition-name", "music-player")
})

test.describe("tiles", () => {
  const tileAnimation = (page: Page) =>
    page.evaluate(
      "getComputedStyle(document.querySelector('[data-testid=player-tiles] path')).animationName"
    )

  test("move while the music plays and stand when paused", async ({ page }) => {
    await mockApi(page)
    await page.goto("/en")
    await expect(playerButton(page)).toBeVisible()
    expect(await tileAnimation(page)).toBe("none")
    const panel = await openPanel(page)
    await panel.getByRole("button", { name: "Play" }).click()
    await expect.poll(() => tileAnimation(page)).toBe("player-tile")
    await panel.getByRole("button", { name: "Pause" }).click()
    await expect.poll(() => tileAnimation(page)).toBe("none")
  })

  test("stand under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await mockApi(page)
    await page.goto("/en")
    const panel = await openPanel(page)
    await panel.getByRole("button", { name: "Play" }).click()
    await expect(playerButton(page)).toHaveAttribute("data-playing", "true")
    expect(await tileAnimation(page)).toBe("none")
  })
})
