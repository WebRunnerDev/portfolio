import * as React from "react"

import { fpsMeter, MIN_FULL_FPS, PROBE_MS } from "@/shared/lib/motion-tier"

import { castLattice, type CastLattice } from "../lib/cast-lattice"
import { usePlaying } from "../lib/use-playing"

// The full layer of the hero: the Cast Lattice on a canvas over the whole
// hero (docs/design-brief.md › Cast Lattice, ADR-0012). Loaded after the
// input gate, paused off screen and on a hidden tab. Transparent until the
// scene's first frame, then it fades in over `lite`; `onShown` once it
// covers it. Falls back to `lite` through `onFail` when the frame rate drops
// below the probe's while it runs, without WebGL2, when the shaders don't
// link or when the context is lost.
export function HeroFull({
  onFail,
  onShown,
}: {
  onFail: () => void
  onShown: () => void
}) {
  const { ref, playing } = usePlaying<HTMLCanvasElement>()
  const scene = React.useRef<CastLattice | null>(null)
  const [ready, setReady] = React.useState(false)
  const fail = React.useEffectEvent(onFail)

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const slow = fpsMeter(PROBE_MS, (fps) => fps < MIN_FULL_FPS && fail())
    scene.current = castLattice(canvas, {
      onFrame: slow,
      onReady: () => setReady(true),
      onFail: () => fail(),
    })
    if (!scene.current) {
      fail()
      return
    }
    return () => {
      scene.current?.destroy()
      scene.current = null
    }
  }, [ref])

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
      onTransitionEnd={onShown}
      className="absolute inset-0 size-full opacity-0 transition-opacity duration-(--zsd-x-zsd-motion-duration-slow) ease-zsd-enter data-[ready=true]:opacity-100"
    />
  )
}
