import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Logo, LogoTiles } from "./logo"

describe("LogoTiles", () => {
  it("places and delays each tile from outside", () => {
    const html = renderToStaticMarkup(
      <LogoTiles placements={[{ x: 2, y: -1, delay: 0.1 }, {}, { y: 3 }]} />
    )
    const styles = [...html.matchAll(/<path d="[^"]*"(?: style="([^"]*)")?>/g)]
    expect(styles).toHaveLength(7)
    expect(styles[0][1]).toBe(
      "transform:translate(2px, -1px);animation-delay:0.1s;transition-delay:0.1s"
    )
    expect(styles[1][1]).toBeUndefined()
    expect(styles[2][1]).toBe("transform:translate(0px, 3px)")
  })

  it("is decorative unless it has a role", () => {
    expect(renderToStaticMarkup(<LogoTiles />)).toContain('aria-hidden="true"')
    const logo = renderToStaticMarkup(<Logo />)
    expect(logo).toContain('role="img"')
    expect(logo).not.toContain("aria-hidden")
    expect(logo).toContain("<title>WebRunner</title>")
  })
})
