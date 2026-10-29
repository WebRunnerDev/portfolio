import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Direction } from "@contracts/lang"
import { DirectionContext } from "@/shared/lib/direction"

import { Reveal } from "./reveal"
import { RevealText } from "./reveal-text"

// `reduced` answers the media query `usePrefersReducedMotion` asks.
const render = (
  node: ReactNode,
  { dir = "ltr", reduced = false }: { dir?: Direction; reduced?: boolean } = {}
) => {
  vi.stubGlobal("window", {
    matchMedia: () => ({
      matches: reduced,
      addEventListener() {},
      removeEventListener() {},
    }),
  })
  return renderToStaticMarkup(
    <DirectionContext.Provider value={dir}>{node}</DirectionContext.Provider>
  )
}

// Before it enters the viewport a part waits hidden (index.css › reveal-*).
const HIDDEN = /reveal-out|reveal-under/

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Reveal", () => {
  it("starts hidden and below its place", () => {
    const html = render(<Reveal>Projects</Reveal>)
    expect(html).toContain('class="reveal-out"')
    expect(html).toContain("--reveal-x:0px;--reveal-y:24px")
  })

  it("comes from the inline start in LTR", () => {
    const html = render(<Reveal x={40}>Projects</Reveal>)
    expect(html).toContain("--reveal-x:-40px;--reveal-y:0px")
  })

  it("mirrors the horizontal offset in RTL", () => {
    const html = render(<Reveal x={40}>Projects</Reveal>, { dir: "rtl" })
    expect(html).toContain("--reveal-x:40px")
  })

  it("staggers by its order", () => {
    const html = render(<Reveal order={2}>Projects</Reveal>)
    expect(html).toContain("--reveal-delay:0.16s")
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
    expect(html.match(/reveal-under/g)).toHaveLength(2)
    expect(html).toContain(">Heavy</span>")
    expect(html).toContain(">graphite</span>")
  })

  it("moves lines whole when split by line", () => {
    const html = render(<RevealText by="line" text={"Heavy graphite\nmoves"} />)
    expect(html.match(/reveal-under/g)).toHaveLength(2)
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
