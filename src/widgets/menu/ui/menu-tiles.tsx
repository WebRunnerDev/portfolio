import { useLayoutEffect, useRef, type RefObject } from "react"

import { LogoTiles } from "@/shared/ui/logo"

import {
  CLOSE,
  OPEN,
  SPREAD_TILES,
  TILE_EASING,
  TILES_OPACITY,
  translate,
} from "../lib/choreography"

// Plays keyframes from where the element is now when it is still moving (the
// menu was closed while opening, or opened while closing), else from `from`.
// Opening fills backwards (the end state is the element's own style), closing
// forwards: the tiles stay in the logo until the menu is gone.
function play(
  el: Element,
  from: Keyframe,
  to: Keyframe,
  timing: KeyframeAnimationOptions
) {
  const running = el.getAnimations()
  if (running.length) {
    const style = getComputedStyle(el)
    from = { transform: style.transform, opacity: style.opacity }
    running.forEach((animation) => animation.cancel())
  }
  el.animate([from, to], { easing: TILE_EASING, ...timing })
}

// The logo tiles of the menu (DESIGN.md › Tile: one element between the
// header and the menu). They rest spread over the screen, faint, through
// `placements`; on open they leave the logo in the menu bar (`slot`, where the
// header logo is) and on close fold back into it. The whole set scales and
// moves on the compositor (Web Animations, transform and opacity only); each
// tile moves inside it. Under reduced motion they just stand spread. The set
// takes its place in the reading direction; the tiles are never mirrored.
export function MenuTiles({
  open,
  slot,
}: {
  open: boolean
  slot: RefObject<HTMLElement | null>
}) {
  const set = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = set.current
    if (!el || !slot.current) return
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return

    // The set's own box (offset*: untransformed), mapped onto the logo slot.
    const box = slot.current.getBoundingClientRect()
    const logo = {
      transform: `translate(${box.left - el.offsetLeft}px, ${box.top - el.offsetTop}px) scale(${box.width / el.offsetWidth})`,
      opacity: 1,
    }
    const spread = { transform: "none", opacity: TILES_OPACITY }
    const tiles = [...el.querySelectorAll("path")]

    if (open) {
      play(el, logo, spread, { duration: OPEN.tiles * 1000, fill: "backwards" })
      tiles.forEach((tile, i) =>
        play(
          tile,
          { transform: translate({}) },
          { transform: translate(SPREAD_TILES[i]) },
          {
            duration: OPEN.tiles * 1000,
            delay: SPREAD_TILES[i].ring * OPEN.tileStagger * 1000,
            fill: "backwards",
          }
        )
      )
    } else {
      const timing = {
        duration: CLOSE.tiles * 1000,
        delay: CLOSE.tilesDelay * 1000,
        fill: "forwards" as const,
      }
      play(el, spread, logo, timing)
      tiles.forEach((tile, i) =>
        play(
          tile,
          { transform: translate(SPREAD_TILES[i]) },
          { transform: translate({}) },
          timing
        )
      )
    }
  }, [open, slot])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        ref={set}
        data-testid="menu-tiles"
        style={{ opacity: TILES_OPACITY }}
        className="absolute inset-y-0 inset-e-0 my-auto size-[min(100vw,100vh)] origin-top-left text-zsd-on-surface"
      >
        <LogoTiles
          placements={SPREAD_TILES}
          className="size-full overflow-visible"
        />
      </div>
    </div>
  )
}
