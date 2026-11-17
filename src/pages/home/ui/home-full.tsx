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

const CANVAS =
  "pointer-events-none fixed inset-0 -z-10 size-full opacity-0 transition-opacity duration-(--zsd-x-zsd-motion-duration-slow) ease-zsd-enter data-[ready=true]:opacity-100"

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
  const { ref, playing } = usePlaying<HTMLElement>()
  const scene = React.useRef<Swarm | null>(null)
  const [ready, setReady] = React.useState(false)
  const [pinned] = React.useState(() => pinnedLevel(window.location.search))
  const [level, setLevel] = React.useState(
    () => pinned ?? (visitLevel ??= pickLevel(thisDevice()))
  )
  const fail = React.useEffectEvent(onFail)
  const shown = React.useEffectEvent(onShown)
  // PROTOTYPE (spike/path-to-10, `?transition=dust`): the canvas lives under
  // <body>, out of React's tree, so it outlives the home page: leaving it,
  // the dust blows off over the next page, then the canvas goes.
  const [external] = React.useState(() => proto("transition") === "dust")
  const outside = React.useRef<HTMLCanvasElement | null>(null)
  const isReady = React.useRef(false)
  const leaving = React.useRef(false)
  const canvasOf = () => {
    if (!external) return ref.current as HTMLCanvasElement | null
    if (!outside.current) {
      const canvas = document.createElement("canvas")
      canvas.setAttribute("aria-hidden", "true")
      canvas.dataset.effect = "full"
      canvas.dataset.swarmScene = ""
      canvas.className = CANVAS
      document.body.appendChild(canvas)
      outside.current = canvas
    }
    return outside.current
  }

  React.useEffect(() => {
    const canvas = outside.current
    if (!canvas) return
    canvas.dataset.playing = String(playing)
    canvas.dataset.ready = String(ready)
    canvas.dataset.quality = level
  })

  React.useLayoutEffect(() => {
    if (!external) return
    return () => {
      const left = scene.current
      const canvas = outside.current
      if (!left || !canvas || !isReady.current) return
      leaving.current = true
      setTimeout(() => {
        canvas.style.opacity = "0"
      }, 450)
      left.leave(() => {
        left.destroy()
        canvas.remove()
      })
    }
  }, [external])

  React.useEffect(() => {
    const canvas = canvasOf()
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
      if (!leaving.current) {
        scene.current?.destroy()
        if (external) {
          outside.current?.remove()
          outside.current = null
        }
      }
      scene.current = null
    }
    // canvasOf reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, lang, pinned])

  React.useEffect(() => {
    if (playing) scene.current?.play()
    else scene.current?.pause()
  }, [playing])

  if (external) {
    // In view always, as the canvas: what usePlaying watches.
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20"
      />
    )
  }

  return (
    <canvas
      ref={ref as React.RefObject<HTMLCanvasElement>}
      aria-hidden="true"
      data-effect="full"
      data-swarm-scene
      data-playing={playing}
      data-ready={ready}
      data-quality={level}
      className={CANVAS}
    />
  )
}
