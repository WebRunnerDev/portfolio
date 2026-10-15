import { describe, expect, it } from "vitest"

import logoSvg from "../../../../public/logo.svg?raw"
import faviconSvg from "../../../../public/favicon.svg?raw"
import { LOGO_TILES } from "./logo"

const pathData = (svg: string) =>
  [...svg.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1])

describe("public/logo.svg", () => {
  it("keeps each tile as its own path, matching the Logo component", () => {
    expect(pathData(logoSvg)).toEqual([...LOGO_TILES])
  })

  it("takes its color from CSS color", () => {
    expect(logoSvg).not.toMatch(/#[0-9a-f]{3,8}/i)
    expect(logoSvg.match(/fill="currentColor"/g)).toHaveLength(
      LOGO_TILES.length
    )
  })
})

describe("public/favicon.svg", () => {
  it("uses the logo tiles and switches color with the tab scheme", () => {
    expect(pathData(faviconSvg)).toEqual([...LOGO_TILES])
    expect(faviconSvg).toContain("prefers-color-scheme: dark")
  })
})
