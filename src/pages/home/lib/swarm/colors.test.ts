import { describe, expect, it } from "vitest"

import { palette, rgb } from "./colors"

// tokens.css, light and dark.
const LIGHT: Record<string, string> = {
  "--zsd-colors-surface": "#F3F4F6",
  "--zsd-colors-outline": "#6B7280",
  "--zsd-colors-outline-muted": "#D1D5DB",
  "--zsd-colors-primary": "#B84530",
}
const DARK: Record<string, string> = {
  ...LIGHT,
  "--zsd-colors-surface": " #121212",
  "--zsd-colors-outline-muted": "#2E2E2E",
}

describe("rgb", () => {
  it("reads #rrggbb and #rgb, spaces around", () => {
    expect(rgb(" #B84530 ")).toEqual([184 / 255, 69 / 255, 48 / 255])
    expect(rgb("#fff")).toEqual([1, 1, 1])
  })

  it("reads a computed color", () => {
    expect(rgb("rgb(15, 23, 42)")).toEqual([15 / 255, 23 / 255, 42 / 255])
    expect(rgb("rgba(255, 0, 0, 0.5)")).toEqual([1, 0, 0])
  })

  it("is black for what it can't read", () => {
    expect(rgb("")).toEqual([0, 0, 0])
  })
})

describe("palette", () => {
  it("keeps the page's surface as is, so the canvas matches the page", () => {
    for (const tokens of [LIGHT, DARK]) {
      const { surface } = palette((token) => tokens[token])
      expect(surface).toEqual(rgb(tokens["--zsd-colors-surface"]))
    }
  })

  it("knows the theme from the surface", () => {
    expect(palette((token) => DARK[token]).dark).toBe(true)
    expect(palette((token) => LIGHT[token]).dark).toBe(false)
  })

  it("makes the light theme's dust darker than the page, rust primary", () => {
    const colors = palette((token) => LIGHT[token])
    const page = 0.9 // #F3F4F6 in linear light, roughly
    for (const channel of colors.steel) expect(channel).toBeLessThan(page / 2)
    expect(colors.flash[0]).toBeGreaterThan(colors.flash[1])
    expect(colors.flash[0]).toBeLessThan(1)
  })
})
