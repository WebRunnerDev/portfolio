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

// The `lite` Hero Tier: a large logo at the end of the hero whose tiles
// breathe out and back in a wave, lighting rust while out (index.css › lite
// Hero Tier). CSS only; paused off screen and on a hidden tab.
export function HeroLite() {
  const { ref, playing } = usePlaying<HTMLDivElement>()

  return (
    <div
      ref={ref}
      data-effect="lite"
      data-playing={playing}
      style={{ "--hero-play": playing ? "running" : "paused" } as CSSProperties}
      className="absolute inset-y-0 inset-e-0 flex w-full hero-fade items-center justify-end overflow-hidden lg:w-2/3"
    >
      <div className="relative me-[-8%] aspect-square h-[78%] max-h-176 lg:me-[6%]">
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
