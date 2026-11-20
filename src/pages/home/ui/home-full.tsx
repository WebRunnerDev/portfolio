import * as React from "react"

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

// How long the canvas stays opaque as the dust blows off (ADR-0014), then
// it fades out over the rest of the scene's leave.
const LEAVE_FADE_MS = 450

const CANVAS =
  "pointer-events-none fixed inset-0 -z-10 size-full opacity-0 transition-opacity duration-(--zsd-x-zsd-motion-duration-slow) ease-zsd-enter data-[ready=true]:opacity-100"

// The scene's canvas, under <body> and out of React's tree (ADR-0014): it
// outlives the home page, so the dust can blow off over the next one. React
// can't own it: moving a canvas React rendered breaks its `removeChild`.
function bodyCanvas() {
  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  canvas.dataset.effect = "full"
  canvas.dataset.swarmScene = ""
  canvas.className = CANVAS
  document.body.appendChild(canvas)
  return canvas
}

// The full layer of the home page: the Swarm on a canvas fixed over the
// viewport behind the whole page (ADR-0013, docs/design-brief.md › Главная
// на Swarm). Loaded after the input gate, paused on a hidden tab.
// Transparent until the scene's first frame, then it fades in with the dust
// scattered over the screen (`onShown`: `lite` fades out meanwhile); a
// crawl lights the hero's web, then the dust gathers into the hero's logo.
// While it runs it watches the frame rate and steps down a level when it
// drops; below a lite level, without WebGL2, when the shaders don't link
// or when the context is lost it falls back to `lite` through `onFail`
// (`lag` when the frame rate was why). A
// level pinned in the URL (`?swarm=`, e2e and acceptance) holds and
// doesn't step down. A new `lang` lays the scene again: the web steps out
// of the hero's text, which is new. Leaving the home page while the scene
// runs, its dust blows off over the next page, then the canvas goes
// (ADR-0014; `main.tsx` skips the View Transition then). It comes from the
// page: an i18n import here would split the shared chunks differently and
// grow every page's initial JS.
export function HomeFull({
  lang,
  onFail,
  onShown,
}: {
  lang: string
  onFail: (reason: string, lag?: boolean) => void
  onShown: () => void
}) {
  // What usePlaying watches in the canvas's stead: over the viewport too.
  const { ref, playing } = usePlaying<HTMLSpanElement>()
  const canvas = React.useRef<HTMLCanvasElement | null>(null)
  const scene = React.useRef<Swarm | null>(null)
  // The canvas whose scene drew its first frame. A new `lang` lays the scene
  // on a canvas of its own: opaque, it stays hidden until it draws too, or
  // it is black over the page.
  const [drawn, setDrawn] = React.useState<HTMLCanvasElement | null>(null)
  const [pinned] = React.useState(() => pinnedLevel(window.location.search))
  const [level, setLevel] = React.useState(
    () => pinned ?? (visitLevel ??= pickLevel(thisDevice()))
  )
  const fail = React.useEffectEvent(onFail)
  const shown = React.useEffectEvent(onShown)
  // A scene laid again while the page is in view plays at once: `playing`
  // doesn't change then, so its effect below doesn't run.
  const inView = React.useEffectEvent(() => playing)
  const leaving = React.useRef(false)

  // Leaving the page: a layout effect's cleanup runs before the scene's
  // below, which then leaves the scene to blow off. Not on a new `lang`.
  React.useLayoutEffect(
    () => () => {
      const left = scene.current
      const element = canvas.current
      if (!left || !element || element.dataset.ready !== "true") return
      leaving.current = true
      // Not the home page's any more: a new one may lay its own meanwhile.
      delete element.dataset.effect
      delete element.dataset.swarmScene
      element.dataset.swarmLeaving = ""
      const fade = setTimeout(() => {
        element.style.opacity = "0"
      }, LEAVE_FADE_MS)
      left.leave(() => {
        clearTimeout(fade)
        // Off the page first: the scene then gives its context back.
        element.remove()
        left.destroy()
      })
    },
    []
  )

  React.useEffect(() => {
    const element = bodyCanvas()
    canvas.current = element
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
          onFail: (fps, at) => fail(`${Math.round(fps)} fps at ${at}`, true),
        })
    const made = swarm(
      element,
      {
        onFrame: watch,
        onReady: () => {
          setDrawn(element)
          shown()
        },
        onFail: (reason) => fail(reason),
      },
      built
    )
    scene.current = made
    if (!made) {
      element.remove()
      canvas.current = null
      fail("no WebGL2")
      return
    }
    if (inView()) made.play()
    return () => {
      scene.current = null
      canvas.current = null
      if (leaving.current) return
      element.remove()
      made.destroy()
    }
  }, [lang, pinned])

  // The canvas's state, after the effect that makes it.
  React.useEffect(() => {
    const element = canvas.current
    if (!element) return
    element.dataset.playing = String(playing)
    element.dataset.ready = String(drawn === element)
    element.dataset.quality = level
  })

  React.useEffect(() => {
    if (playing) scene.current?.play()
    else scene.current?.pause()
  }, [playing])

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20"
    />
  )
}
