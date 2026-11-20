import type { Page } from "@playwright/test"

// The home page's brand handoff (DESIGN.md › Tile): the header logo and the
// hero's brand it waits for.
export const headerLogo = (page: Page) =>
  page.getByRole("banner").getByRole("img", { name: "WebRunner" })
export const heroBrand = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "WebRunner" })

// The hero's brand just under the header. Without D1 (CI) the page may be
// too short for it, so the body grows first.
export const scrollPastBrand = (page: Page) =>
  page.evaluate(`
    document.body.style.paddingBottom = "200vh"
    scrollTo(0, scrollY + document.querySelector("h1").getBoundingClientRect().bottom)
  `)
