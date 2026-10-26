import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MotionConfig } from "motion/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Direction } from "@contracts/lang"
import { DirectionContext } from "@/shared/lib/direction"

import { Reveal } from "./reveal"
import { RevealText } from "./reveal-text"

const render = (
  node: ReactNode,
  { dir = "ltr", reduced = false }: { dir?: Direction; reduced?: boolean } = {}
) =>
  renderToStaticMarkup(
    <MotionConfig reducedMotion={reduced ? "always" : "never"}>
      <DirectionContext.Provider value={dir}>{node}</DirectionContext.Provider>
    </MotionConfig>
  )

// `m` components render their `initial` state as inline styles.
const HIDDEN = /opacity:0|translateY\(120%\)/

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Reveal", () => {
  it("starts hidden and below its place", () => {
    const html = render(<Reveal>Projects</Reveal>)
    expect(html).toMatch(/opacity:0/)
    expect(html).toContain("translateY(24px)")
  })

  it("comes from the inline start in LTR", () => {
    const html = render(<Reveal x={40}>Projects</Reveal>)
    expect(html).toContain("translateX(-40px)")
  })

  it("mirrors the horizontal offset in RTL", () => {
    const html = render(<Reveal x={40}>Projects</Reveal>, { dir: "rtl" })
    expect(html).toContain("translateX(40px)")
  })

  it("shows the end state at once under reduced motion", () => {
    const html = render(<Reveal x={40}>Projects</Reveal>, {
      dir: "rtl",
      reduced: true,
    })
    expect(html).toBe("<div>Projects</div>")
  })

  it("shows the content without IntersectionObserver", () => {
    vi.unstubAllGlobals()
    vi.stubGlobal("IntersectionObserver", undefined)
    expect(render(<Reveal as="section">Projects</Reveal>)).toBe(
      "<section>Projects</section>"
    )
  })
})

describe("RevealText", () => {
  it("puts each word under its own mask, below it", () => {
    const html = render(<RevealText text="Heavy graphite" />)
    expect(html.match(/translateY\(120%\)/g)).toHaveLength(2)
    expect(html).toContain(">Heavy</span>")
    expect(html).toContain(">graphite</span>")
  })

  it("moves lines whole when split by line", () => {
    const html = render(<RevealText by="line" text={"Heavy graphite\nmoves"} />)
    expect(html.match(/translateY\(120%\)/g)).toHaveLength(2)
    expect(html).toContain(">Heavy graphite</span>")
  })

  it("gives screen readers the text in one piece", () => {
    const html = render(<RevealText as="h1" text={"Heavy\ngraphite"} />)
    expect(html).toContain('<span class="sr-only">Heavy graphite</span>')
    expect(html).toContain('<span aria-hidden="true">')
  })

  it("splits Arabic by words and keeps their order", () => {
    const html = render(<RevealText text="مطور واجهات" />, { dir: "rtl" })
    expect(html.indexOf(">مطور</span>")).toBeLessThan(
      html.indexOf(">واجهات</span>")
    )
  })

  it("renders plain lines under reduced motion", () => {
    const html = render(<RevealText as="h1" text={"Heavy\ngraphite"} />, {
      reduced: true,
    })
    expect(html).not.toMatch(HIDDEN)
    expect(html).toBe(
      '<h1><span class="block">Heavy</span><span class="block">graphite</span></h1>'
    )
  })
})
