import type { CSSProperties } from "react"

import { STAGGER } from "@/shared/lib/motion"
import { LogoTiles, type TilePlacement } from "@/shared/ui/logo"

import { spread, waveStep } from "../lib/tiles"

// docs/design-brief.md › Load choreography: the words of the brand from
// 200 ms, `stagger-word` apart; the logo tiles gather at the same time.
const START = 0.2
const WORDS = ["Web", "Runner"]
// Each tile starts out from the logo and flies into its place, left to right.
const GATHER: TilePlacement[] = spread(1.5).map((offset, i) => ({
  ...offset,
  delay: START + waveStep[i] * STAGGER.word,
}))

const delay = (seconds: number) =>
  ({ "--hero-delay": `${seconds}s` }) as CSSProperties

// The brand as the page's h1 (the LCP element): `display-lg`, two lines
// "Web" / "Runner" below `lg`, each word rising from under a mask in CSS, so
// it paints before any script. The logo tiles gather at its end, at the
// height of the capitals; their place follows the Direction, the brand and
// the logo stay LTR. Screen readers get "WebRunner" in one piece.
export function HeroBrand() {
  return (
    <h1 className="flex items-start gap-[0.12em] text-hero-brand">
      <span className="sr-only">WebRunner</span>
      <span aria-hidden="true" dir="ltr" className="min-w-0">
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
      <LogoTiles
        placements={GATHER}
        tileClassName="hero-gather"
        className="mt-[0.06em] size-[0.62em] shrink-0 overflow-visible"
      />
    </h1>
  )
}
