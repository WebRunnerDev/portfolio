import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// Issue #124: axe on every public page in both themes and on /ar, and a
// keyboard pass. Against the audit server (scripts/audit/server.mjs), whose
// D1 has one of everything (scripts/audit/seed.sql).
const PAGES = [
  "/en",
  "/en/cv",
  "/en/projects",
  "/en/projects/edge-portfolio",
  "/en/gallery",
  "/en/gallery/astana",
  "/en/blog",
  "/en/blog/edge-caching",
  "/ar",
  "/ar/cv",
  "/ar/projects/edge-portfolio",
  "/ar/blog/edge-caching",
]

// WCAG 2.2 A and AA, contrast included.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

async function open(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator("main h1").first()).toBeVisible()
  // Entrances (ADR-0005) run before axe reads the colours.
  await page.evaluate(
    `Promise.allSettled(document.getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .map((a) => a.finished))`
  )
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    for (const path of PAGES) {
      test(`axe: ${path}`, async ({ page }) => {
        await open(page, path)
        const { violations } = await new AxeBuilder({ page })
          .withTags(TAGS)
          .analyze()
        const serious = violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => ({
            id: v.id,
            impact: v.impact,
            targets: v.nodes.map((node) => node.target.join(" ")),
          }))
        expect(serious).toEqual([])
      })
    }
  })
}

type Focused = { id: string; label: string; visible: boolean; ring: boolean }

// The focused element, if any: on screen, and with an outline or a ring. A
// chamfered ring is the ::before of the element or of the card around its
// `.card-link` (src/index.css › focus-chamfer).
const FOCUSED = `(() => {
  const element = document.activeElement
  if (!element || element === document.body) return null
  const rect = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  const label = element.outerHTML.slice(0, 120)
  let chamfer = false
  for (let at = element; at && !chamfer; at = at.parentElement) {
    chamfer = getComputedStyle(at, "::before").content !== "none" &&
      getComputedStyle(at, "::before").clipPath !== "none"
  }
  return {
    id: label + [...(element.parentElement?.children ?? [])].indexOf(element),
    label,
    visible: rect.width > 0 && rect.height > 0,
    ring:
      (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
      style.boxShadow !== "none" ||
      chamfer,
  }
})()`

// Every stop of the Tab order is on screen and shows a focus ring, and the
// order leaves the page instead of getting stuck.
for (const path of PAGES) {
  test(`keyboard: ${path}`, async ({ page }) => {
    await open(page, path)
    const seen = new Set<string>()
    for (let stop = 0; stop < 80; stop++) {
      await page.keyboard.press("Tab")
      const focused = await page.evaluate<Focused | null>(FOCUSED)
      if (!focused) break
      expect(focused.visible, focused.label).toBe(true)
      expect(focused.ring, focused.label).toBe(true)
      if (seen.has(focused.id)) break
      seen.add(focused.id)
    }
    expect(seen.size).toBeGreaterThan(3)
  })
}
