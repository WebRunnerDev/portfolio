import { describe, expect, it } from "vitest"

import { palette, rgb } from "./colors"

// tokens.css, light and dark.
const LIGHT: Record<string, string> = {
  "--zsd-colors-surface": "#F3F4F6",
  "--zsd-colors-surface-raised": "#E5E7EB",
  "--zsd-colors-outline-muted": "#D1D5DB",
  "--zsd-colors-outline": "#6B7280",
  "--zsd-colors-primary": "#B84530",
}
const DARK: Record<string, string> = {
  ...LIGHT,
  "--zsd-colors-surface": " #121212",
  "--zsd-colors-surface-raised": "#1E1E1E",
  "--zsd-colors-outline-muted": "#2E2E2E",
}

describe("rgb", () => {
  it("reads #rrggbb and #rgb, spaces around", () => {
    expect(rgb(" #B84530 ")).toEqual([184 / 255, 69 / 255, 48 / 255])
    expect(rgb("#fff")).toEqual([1, 1, 1])
  })

  it("is black for what it can't read", () => {
    expect(rgb("")).toEqual([0, 0, 0])
  })
})

describe("palette", () => {
  it("steps toward the light from surface, lighter in either theme", () => {
    for (const tokens of [LIGHT, DARK]) {
      const { surface, step } = palette((token) => tokens[token])
      expect(surface).toEqual(rgb(tokens["--zsd-colors-surface"]))
      for (const channel of step) expect(channel).toBeGreaterThan(0)
    }
  })

  it("takes rims, glint and crests from their tokens", () => {
    const colors = palette((token) => DARK[token])
    expect(colors.edge).toEqual(rgb("#2E2E2E"))
    expect(colors.glint).toEqual(rgb("#6B7280"))
    expect(colors.crest).toEqual(rgb("#B84530"))
  })
})
