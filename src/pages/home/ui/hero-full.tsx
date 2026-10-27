import * as React from "react"

import { kineticGrid, type KineticGrid } from "../lib/kinetic-grid"
import { usePlaying } from "../lib/use-playing"
import { fpsMeter, MIN_FULL_FPS, PROBE_MS } from "../model/tier"

// The `full` Hero Tier: the Kinetic Grid on a canvas over the whole hero
// (docs/design-brief.md › Hero effect). Loaded lazily, paused off screen and
// on a hidden tab. Falls back to `lite` through `onFail` when the frame rate
// drops below the probe's while it runs, or when the canvas loses its
// context.
export function HeroFull({ onFail }: { onFail: () => void }) {
  const { ref, playing } = usePlaying<HTMLCanvasElement>()
  const grid = React.useRef<KineticGrid | null>(null)
  const fail = React.useEffectEvent(onFail)

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const slow = fpsMeter(PROBE_MS, (fps) => fps < MIN_FULL_FPS && fail())
    grid.current = kineticGrid(canvas, slow)
    if (!grid.current) {
      fail()
      return
    }
    // Not preventing the default leaves the context lost for good: `lite`
    // takes over, with nothing in the console.
    const lost = () => fail()
    canvas.addEventListener("contextlost", lost)
    return () => {
      canvas.removeEventListener("contextlost", lost)
      grid.current?.destroy()
      grid.current = null
    }
  }, [ref])

  React.useEffect(() => {
    if (playing) grid.current?.play()
    else grid.current?.pause()
  }, [playing])

  return (
    <canvas
      ref={ref}
      data-effect="full"
      data-playing={playing}
      className="absolute inset-0 size-full hero-fade"
    />
  )
}
