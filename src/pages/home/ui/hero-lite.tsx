import type { CSSProperties } from "react"

import { STAGGER } from "@/shared/lib/motion"
import { LogoTiles, type TilePlacement } from "@/shared/ui/logo"

import { spread, waveStep } from "../lib/tiles"
import { usePlaying } from "../lib/use-playing"

// docs/design-brief.md › Load choreography: the effect starts in the last
// part of the sequence, after the text.
const START = 0.8
// The wave crosses the logo slower than the text staggers: it is a loop in
// the background, not an entrance.
const WAVE_STEP = 3 * STAGGER.item
const PLACEMENTS: TilePlacement[] = spread(0.3).map((offset, i) => ({
  ...offset,
  delay: START + waveStep[i] * WAVE_STEP,
}))

// The square the Swarm's dust gathers into at `full` (ADR-0013,
// docs/design-brief.md › Главная на Swarm › Hero): in the band under the
// actions, at the end, clear of the text. Below `sm` its size comes from the
// hero (index.css › hero-logo-band), which keeps the text out of it. The
// scene reads its box once a frame; it draws nothing.
export function HeroLogoAnchor() {
  return (
    <div
      data-swarm-anchor="hero"
      className="absolute inset-e-[5%] bottom-[4%] aspect-square h-[24%] max-h-72 max-sm:bottom-(--hero-logo-bottom) max-sm:h-(--hero-logo) lg:bottom-[6%] lg:h-[30%]"
    />
  )
}

// The hero at the `lite` Motion Tier: a large logo at the end of the hero
// whose tiles breathe out and back in a wave, lighting rust while out
// (index.css › lite Motion Tier). CSS only; paused off screen and on a
// hidden tab. At `full` it fades out while the scene fades in (`leaving`,
// the same `duration-slow`) and calls `onLeft` once it has.
export function HeroLite({
  leaving = false,
  onLeft,
}: {
  leaving?: boolean
  onLeft?: () => void
}) {
  const { ref, playing } = usePlaying<HTMLDivElement>()

  return (
    <div
      ref={ref}
      data-effect="lite"
      data-playing={playing}
      style={{ "--hero-play": playing ? "running" : "paused" } as CSSProperties}
      className="absolute inset-y-0 inset-e-0 flex w-full hero-fade items-center justify-end overflow-hidden lg:w-2/3"
    >
      <div
        data-leaving={leaving}
        onTransitionEnd={(event) => {
          if (leaving && event.target === event.currentTarget) onLeft?.()
        }}
        className="relative me-[-8%] aspect-square h-[78%] max-h-176 transition-opacity duration-(--zsd-x-zsd-motion-duration-slow) ease-zsd-exit data-[leaving=true]:opacity-0 lg:me-[6%]"
      >
        <LogoTiles
          placements={PLACEMENTS}
          tileClassName="hero-breathe"
          className="absolute inset-0 size-full overflow-visible text-zsd-outline-muted"
        />
        <LogoTiles
          placements={PLACEMENTS}
          tileClassName="hero-glow"
          className="absolute inset-0 size-full overflow-visible text-zsd-primary"
        />
      </div>
    </div>
  )
}
