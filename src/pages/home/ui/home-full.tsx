import * as React from "react"

import { proto } from "@/shared/lib/prototype"

import {
  LEVELS,
  lowered,
  pickLevel,
  pinnedLevel,
  stepDown,
  swarm,
  thisDevice,
  type Level,
  type Swarm,
} from "../lib/swarm"
import { usePlaying } from "../lib/use-playing"

// The scene's level (ADR-0013 › Уровни качества), picked on its first start
// in the visit and lowered as it steps down. It lives in the chunk's memory
// for the rest of the visit: back on the home page the scene is laid again
// at it, with its own count of nodes. Not kept between visits.
let visitLevel: Level | null = null

// The full layer of the home page: the Swarm on a canvas fixed over the
// viewport behind the whole page (ADR-0013, docs/design-brief.md › Главная
// на Swarm). Loaded after the input gate, paused on a hidden tab.
// Transparent until the scene's first frame, then it fades in with the dust
// scattered over the screen (`onShown`: `lite` fades out meanwhile); a
// crawl lights the hero's web, then the dust gathers into the hero's logo.
// While it runs it watches the frame rate and steps down a level when it
// drops; below a lite level, without WebGL2, when the shaders don't link
// or when the context is lost it falls back to `lite` through `onFail`. A
// level pinned in the URL (`?swarm=`, e2e and acceptance) holds and
// doesn't step down. A new `lang` lays the scene again: the web steps out
// of the hero's text, which is new. It comes from the page: an i18n import
// here would split the shared chunks differently and grow every page's
// initial JS.
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
  const [pinned] = React.useState(() => pinnedLevel(window.location.search))
  const [level, setLevel] = React.useState(
    () => pinned ?? (visitLevel ??= pickLevel(thisDevice()))
  )
  const fail = React.useEffectEvent(onFail)
  const shown = React.useEffectEvent(onShown)
  // PROTOTYPE (spike/path-to-10, `?transition=dust`): leaving the home page
  // the canvas moves under <body> and outlives it while the dust blows off.
  const isReady = React.useRef(false)
  const leaving = React.useRef(false)

  React.useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas || proto("transition") !== "dust") return
    return () => {
      const left = scene.current
      if (!left || !isReady.current || !canvas.isConnected) return
      leaving.current = true
      document.body.appendChild(canvas)
      setTimeout(() => {
        canvas.style.opacity = "0"
      }, 450)
      left.leave(() => {
        left.destroy()
        canvas.remove()
      })
    }
  }, [ref])

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    // Laid again (a new `lang`) at the level the visit is at now.
    const start = pinned ?? (visitLevel ??= pickLevel(thisDevice()))
    const built = LEVELS[start]
    const watch = pinned
      ? () => {}
      : stepDown(start, {
          onLower: (next) => {
            visitLevel = next
            setLevel(next)
            scene.current?.lower(lowered(built, next))
          },
          onFail: () => fail(),
        })
    scene.current = swarm(
      canvas,
      {
        onFrame: watch,
        onReady: () => {
          isReady.current = true
          setReady(true)
          shown()
        },
        onFail: () => fail(),
      },
      built
    )
    if (!scene.current) {
      fail()
      return
    }
    return () => {
      if (!leaving.current) scene.current?.destroy()
      scene.current = null
    }
  }, [ref, lang, pinned])

  React.useEffect(() => {
    if (playing) scene.current?.play()
    else scene.current?.pause()
  }, [playing])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-effect="full"
      data-swarm-scene
      data-playing={playing}
      data-ready={ready}
      data-quality={level}
      className="pointer-events-none fixed inset-0 -z-10 size-full opacity-0 transition-opacity duration-(--zsd-x-zsd-motion-duration-slow) ease-zsd-enter data-[ready=true]:opacity-100"
    />
  )
}
