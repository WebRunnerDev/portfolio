import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { Loader } from "./loader"

// No router here to read the Lang from.
vi.mock("@/shared/i18n/use-lang", () => ({ useLang: () => "en" }))

describe("Loader", () => {
  it("is a status with a label", () => {
    const html = renderToStaticMarkup(<Loader />)
    expect(html).toContain('role="status"')
    expect(html).toContain("Loading…")
  })

  it("lights the tiles as a wave, stagger-item apart", () => {
    const html = renderToStaticMarkup(<Loader />)
    const delays = [...html.matchAll(/animation-delay:([\d.]+)s/g)].map(
      (m) => m[1]
    )
    // The first tile (step 0) has no delay; the other six do.
    expect(delays).toEqual(["0.32", "0.16", "0.08", "0.24", "0.32", "0.4"])
    expect(html.match(/class="loader-tile"/g)).toHaveLength(7)
  })

  it("waits before it shows, unless the router already waited", () => {
    expect(renderToStaticMarkup(<Loader />)).toContain("loader-delayed")
    expect(renderToStaticMarkup(<Loader delay={false} />)).not.toContain(
      "loader-delayed"
    )
  })

  it("hides the tiles from assistive technology", () => {
    const html = renderToStaticMarkup(<Loader />)
    expect(html.match(/<svg[^>]*aria-hidden="true"/g)).toHaveLength(2)
  })
})
