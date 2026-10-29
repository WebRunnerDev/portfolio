import { expect, test } from "@playwright/test"

// Issue #7: system theme by default, a switcher, no light flash on reload.
const DARK_SURFACE = "rgb(18, 18, 18)"
const LIGHT_SURFACE = "rgb(243, 244, 246)"

test("dark reload paints dark before the app's JS runs", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"))
  // Only the inline script in index.html is left to set the theme.
  await page.route(/\/assets\/.+\.js$/, (route) => route.abort())
  await page.goto("/en", { waitUntil: "domcontentloaded" })

  const html = page.locator("html")
  await expect(html).toHaveClass(/\bdark\b/)
  await expect(page.locator("body")).toHaveCSS("background-color", DARK_SURFACE)
  await expect(html).toHaveCSS("color-scheme", "dark")
})

test("follows the system theme by default", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/en")
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  const toggle = page.getByRole("button", { name: "Dark" })
  await expect(toggle).toHaveAttribute("aria-pressed", "true")

  await page.emulateMedia({ colorScheme: "light" })
  await expect(page.locator("html")).toHaveClass(/\blight\b/)
  await expect(toggle).toHaveAttribute("aria-pressed", "false")
})

// Light and dark only: no "system" option to pick.
test("the toggle works from the keyboard and persists", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" })
  await page.goto("/en")

  const toggle = page.getByRole("button", { name: "Dark" })
  await expect(toggle).toHaveAttribute("aria-pressed", "false")
  await toggle.focus()
  await page.keyboard.press("Enter")
  await expect(toggle).toHaveAttribute("aria-pressed", "true")
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await expect(page.locator("body")).toHaveCSS("background-color", DARK_SURFACE)

  await page.reload()
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await expect(page.getByRole("button", { name: "Dark" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
})

test("labels follow the Lang", async ({ page }) => {
  await page.goto("/ru")
  await expect(page.getByRole("button", { name: "Тёмная" })).toBeVisible()
})

test("works when storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError")
      },
    })
  })
  await page.emulateMedia({ colorScheme: "light" })
  await page.goto("/en")

  await expect(page.getByRole("heading", { name: "WebRunner" })).toBeVisible()
  const toggle = page.getByRole("button", { name: "Dark" })
  await toggle.click()
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await toggle.click()
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    LIGHT_SURFACE
  )
})
