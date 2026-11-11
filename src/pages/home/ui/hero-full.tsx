import * as React from "react"

import { fpsMeter, MIN_FULL_FPS, PROBE_MS } from "@/shared/lib/motion-tier"

import { castLattice, type CastLattice } from "../lib/cast-lattice"
import { usePlaying } from "../lib/use-playing"

// The full layer of the hero: the Cast Lattice on a canvas over the whole
// hero (docs/design-brief.md › Cast Lattice, ADR-0012). Loaded after the
// input gate, paused off screen and on a hidden tab. As the hero leaves, its
// copies rise into the hero's logo tiles (`tiles`); `data-rise` once they
// do, and the header logo's flight waits for them (index.css › Logo flight). Transparent until the
// scene's first frame, then it fades in over `lite`; `onShown` once it
// covers it. Falls back to `lite` through `onFail` when the frame rate drops
// below the probe's while it runs, without WebGL2, when the shaders don't
// link or when the context is lost.
export function HeroFull({
  onFail,
  onShown,
  tiles,
}: {
  onFail: () => void
  onShown: () => void
  tiles: React.RefObject<Element | null>
}) {
  const { ref, playing } = usePlaying<HTMLCanvasElement>()
  const scene = React.useRef<CastLattice | null>(null)
  const [ready, setReady] = React.useState(false)
  const [rising, setRising] = React.useState(false)
  const fail = React.useEffectEvent(onFail)

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const slow = fpsMeter(PROBE_MS, (fps) => fps < MIN_FULL_FPS && fail())
    scene.current = castLattice(canvas, {
      onFrame: slow,
      onReady: () => setReady(true),
      onFail: () => fail(),
      tiles: () => tiles.current,
      onRise: () => setRising(true),
    })
    if (!scene.current) {
      fail()
      return
    }
    return () => {
      scene.current?.destroy()
      scene.current = null
    }
  }, [ref, tiles])

  React.useEffect(() => {
    if (playing) scene.current?.play()
    else scene.current?.pause()
  }, [playing])

  return (
    <canvas
      ref={ref}
      data-effect="full"
      data-playing={playing}
      data-ready={ready}
      data-rise={rising || undefined}
      onTransitionEnd={onShown}
      className="absolute inset-0 size-full opacity-0 transition-opacity duration-(--zsd-x-zsd-motion-duration-slow) ease-zsd-enter data-[ready=true]:opacity-100"
    />
  )
}
