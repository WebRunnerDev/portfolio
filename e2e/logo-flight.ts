import { expect, type Page } from "@playwright/test"

// The home page's logo flight (issue #158, DESIGN.md › Tile): the header
// logo and the hero's tiles it flies from.
export const headerLogo = (page: Page) =>
  page.getByRole("banner").getByRole("img", { name: "WebRunner" })
export const heroTiles = (page: Page) =>
  page.getByRole("heading", { level: 1 }).locator("svg")

// A few pixels into the hero's exit the header logo shows in place of the
// hero's tiles, over them, and the hero's hide.
export async function expectTakeOff(page: Page) {
  await expect(heroTiles(page)).toHaveCSS("opacity", "1")
  // The fonts in, so the tiles sit where they end up.
  await page.evaluate("document.fonts.ready")
  await page.evaluate("scrollTo(0, 3)")
  await expect(heroTiles(page)).toHaveCSS("opacity", "0")
  await expect(headerLogo(page)).toHaveCSS("opacity", "1")
  const tiles = (await heroTiles(page).boundingBox())!
  const logo = (await headerLogo(page).boundingBox())!
  for (const key of ["x", "y", "width"] as const) {
    expect(Math.abs(logo[key] - tiles[key])).toBeLessThanOrEqual(4)
  }
  return { tiles, logo }
}

// Past the hero's whole exit. Without D1 (CI) the page is too short for it,
// so the body grows first.
export const scrollPastHero = (page: Page) =>
  page.evaluate(`
    document.body.style.paddingBottom = "200vh"
    scrollTo(0, scrollY + document.querySelector("section[data-tier]").getBoundingClientRect().bottom)
  `)
