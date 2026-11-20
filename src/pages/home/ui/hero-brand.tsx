import type { CSSProperties } from "react"

import { useBrandHandoff } from "@/shared/lib/brand-handoff"
import { STAGGER } from "@/shared/lib/motion"

// docs/design-brief.md › Load choreography: the words of the brand from
// 200 ms, `stagger-word` apart.
const START = 0.2
const WORDS = ["Web", "Runner"]

const delay = (seconds: number) =>
  ({ "--hero-delay": `${seconds}s` }) as CSSProperties

// The brand as the page's h1 (the LCP element): `display-lg`, two lines
// "Web" / "Runner" below `lg`, each word rising from under a mask in CSS, so
// it paints before any script. The word alone: the hero's logo is its
// effect's, and two would compete. It stays LTR. Screen readers get
// "WebRunner" in one piece. Once it has gone under the header, the header's
// lockup fills (@/shared/lib/brand-handoff). The Swarm's web steps out of it
// (`data-swarm-text`), so it is as wide as the brand, not the hero.
export function HeroBrand() {
  const ref = useBrandHandoff<HTMLHeadingElement>()

  return (
    <h1
      ref={ref}
      data-swarm-text
      className="brand-handoff-from w-fit max-w-full text-hero-brand"
    >
      <span className="sr-only">WebRunner</span>
      <span aria-hidden="true" dir="ltr" className="block">
        {WORDS.map((word, i) => (
          <span
            key={word}
            className="-my-[0.15em] inline-block overflow-hidden py-[0.15em] max-lg:block"
          >
            <span
              style={delay(START + i * STAGGER.word)}
              className="inline-block hero-rise"
            >
              {word}
            </span>
          </span>
        ))}
      </span>
    </h1>
  )
}
