import * as React from "react"

import { fpsMeter, MIN_FULL_FPS, PROBE_MS } from "@/shared/lib/motion-tier"

import { swarm, type Swarm } from "../lib/swarm"
import { usePlaying } from "../lib/use-playing"

// The site's parts the crawl readout walks through, on the current Lang.
const PARTS = ["", "/cv", "/projects", "/gallery", "/blog"]

// The full layer of the home page: the Swarm on a canvas fixed over the
// viewport behind the whole page (ADR-0013, docs/design-brief.md › Главная
// на Swarm). Loaded after the input gate, paused on a hidden tab.
// Transparent until the scene's first frame, then it fades in with the dust
// scattered over the screen (`onShown`: `lite` fades out meanwhile) and the
// dust gathers into the hero's logo. Falls back to `lite` through `onFail` when the
// frame rate drops below the probe's while it runs, without WebGL2, when
// the shaders don't link or when the context is lost.
// `lang` comes from the page: an i18n import here would split the shared
// chunks differently and grow every page's initial JS.
export function HomeFull({
  lang,
  onFail,
  onShown,
}: {
  lang: string
  onFail: () => void
  onShown: () => void
}) {
  const { ref, playing } = usePlaying<HTMLCanvasElement>()
  const scene = React.useRef<Swarm | null>(null)
  const [ready, setReady] = React.useState(false)
  const fail = React.useEffectEvent(onFail)
  const shown = React.useEffectEvent(onShown)

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const slow = fpsMeter(PROBE_MS, (fps) => fps < MIN_FULL_FPS && fail())
    scene.current = swarm(canvas, {
      onFrame: slow,
      onReady: () => {
        setReady(true)
        shown()
      },
      onFail: () => fail(),
      paths: PARTS.map((part) => `/${lang}${part}`),
    })
    if (!scene.current) {
      fail()
      return
    }
    return () => {
      scene.current?.destroy()
      scene.current = null
    }
  }, [ref, lang])

  React.useEffect(() => {
    if (playing) scene.current?.play()
    else scene.current?.pause()
  }, [playing])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-effect="full"
      data-playing={playing}
      data-ready={ready}
      className="pointer-events-none fixed inset-0 -z-10 size-full opacity-0 transition-opacity duration-(--zsd-x-zsd-motion-duration-slow) ease-zsd-enter data-[ready=true]:opacity-100"
    />
  )
}
