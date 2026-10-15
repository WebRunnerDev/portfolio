import { expect, test } from "@playwright/test"

// Issue #9: contacts in the footer on every page.
test("footer links to every contact", async ({ page }) => {
  await page.goto("/en/projects")
  const contacts = page
    .getByRole("contentinfo")
    .getByRole("list", { name: "Contacts" })
  await expect(
    contacts.getByRole("link", { name: "aibyn_@outlook.com" })
  ).toHaveAttribute("href", "mailto:aibyn_@outlook.com")
  await expect(
    contacts.getByRole("link", { name: "Telegram" })
  ).toHaveAttribute("href", "https://t.me/WebRunner_dev")
  await expect(
    contacts.getByRole("link", { name: "LinkedIn" })
  ).toHaveAttribute("href", "https://www.linkedin.com/in/zhasulan-abdigaliyev")
  await expect(contacts.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/WebRunnerDev"
  )
  await expect(
    contacts.getByRole("link", { name: /\+?\d[\d\s-]{6,}/ })
  ).toHaveCount(0)
})

test("copy email puts it on the clipboard and announces it", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/ru")
  const footer = page.getByRole("contentinfo")
  await footer.getByRole("button", { name: "Скопировать почту" }).click()
  await expect(footer.getByRole("status")).toHaveText("Скопировано")
  expect(await page.evaluate("navigator.clipboard.readText()")).toBe(
    "aibyn_@outlook.com"
  )
  await expect(footer.getByRole("status")).toHaveText("", { timeout: 4000 })
})

test("copy failure is reported", async ({ page }) => {
  // A string: the e2e tsconfig has no DOM types.
  await page.addInitScript(
    "navigator.clipboard.writeText = () => Promise.reject(new Error('denied'))"
  )
  await page.goto("/de/blog")
  const footer = page.getByRole("contentinfo")
  await footer.getByRole("button", { name: "E-Mail kopieren" }).click()
  await expect(footer.getByRole("status")).toHaveText("Kopieren fehlgeschlagen")
})

test("ar uses the EN strings", async ({ page }) => {
  await page.goto("/ar")
  await expect(
    page.getByRole("contentinfo").getByRole("button", { name: "Copy email" })
  ).toBeVisible()
})
