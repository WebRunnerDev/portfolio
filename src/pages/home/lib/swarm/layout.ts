import { EASE } from "@/shared/lib/motion"

import { centers } from "../tiles"
import { HALF_DIAGONAL } from "./dust"
import { bezier, clamp, lerp } from "./math"

// The camera: a narrow field of view from CAM_D in front of the plane z = 0,
// which the viewport maps onto. The canvas is fixed over the viewport, so a
// box from getBoundingClientRect is a place on that plane.
export const FOV = (30 * Math.PI) / 180
export const CAM_D = 24
// The plane's height in world units.
export const VIEW_H = 2 * CAM_D * Math.tan(FOV / 2)

export type Viewport = { width: number; height: number }
export type Box = Pick<DOMRect, "left" | "top" | "width" | "height">
export type Slot = { x: number; y: number; scale: number }

// A point of the viewport (CSS pixels) on the plane.
export const toWorld = (view: Viewport, px: number, py: number) => ({
  x: (px / view.width - 0.5) * VIEW_H * (view.width / view.height),
  y: -(py / view.height - 0.5) * VIEW_H,
})

const pxToWorld = (view: Viewport, px: number) => (px / view.height) * VIEW_H

// Block `i` of the logo laid out in `box` (the logo's square, as the page
// lays the logo tiles): its center and the scale that makes its dust the
// size of the tile, a little smaller so the gaps between tiles show.
export function logoSlot(view: Viewport, box: Box, i: number): Slot {
  const size = Math.min(box.width, box.height)
  const { x, y } = centers[i]
  const at = toWorld(
    view,
    box.left + box.width / 2 + ((x - 5) / 10) * size,
    box.top + box.height / 2 + ((y - 5) / 10) * size
  )
  return {
    ...at,
    // A tile is 3 logo units across: its half-diagonal is 0.15 of the logo.
    scale: (pxToWorld(view, size * 0.15) * 0.9) / HALF_DIAGONAL,
  }
}

// Before the gather the blocks stand spread out around the logo, wider than
// the screen and smaller: the logo's square grown to SPREAD × the
// viewport's short side, its center a share of the way to the viewport's.
const SPREAD = 1.35
const SPREAD_SCALE = 0.62
const TOWARD_CENTER = 0.45
export function spreadBox(view: Viewport, logo: Box): Box {
  const size = Math.min(view.width, view.height) * SPREAD
  const cx = lerp(logo.left + logo.width / 2, view.width / 2, TOWARD_CENTER)
  const cy = logo.top + logo.height / 2
  return { left: cx - size / 2, top: cy - size / 2, width: size, height: size }
}

// Block `i` `k` of the way from the spread to the logo.
export function gatherSlot(view: Viewport, logo: Box, i: number, k: number) {
  const to = logoSlot(view, logo, i)
  const from = logoSlot(view, spreadBox(view, logo), i)
  return {
    x: lerp(from.x, to.x, k),
    y: lerp(from.y, to.y, k),
    scale: lerp(to.scale * SPREAD_SCALE, to.scale, k),
  }
}

// A chapter's block on its rail: in the middle of the rail's square, its
// rhombus across it.
export function railSlot(view: Viewport, box: Box): Slot {
  return {
    ...toWorld(view, box.left + box.width / 2, box.top + box.height / 2),
    scale:
      pxToWorld(view, Math.min(box.width, box.height) * 0.5) / HALF_DIAGONAL,
  }
}

const layout = bezier(EASE.layout)

// docs/design-brief.md › Главная на Swarm › На главной › Главы: how far a
// chapter's block has come from the hero's logo to its rail, 0–1 on
// `easing-layout`: from the rail's top just over the viewport's bottom to
// half a viewport above that. Back the same way.
export const arrival = (view: Viewport, rail: Box) =>
  layout(clamp((view.height * 0.98 - rail.top) / (view.height * 0.5)))

// › Футер: how far the blocks have gathered into the footer's logo, 0–1 on
// `easing-layout`: from the top of its square (`logo`) at the viewport's
// bottom over three quarters of a viewport, or over what is left of the
// footer from there when that is less, so they have gathered by the end of
// the page.
export const gathering = (
  view: Viewport,
  logo: Pick<Box, "top">,
  footer: Pick<DOMRect, "bottom">
) =>
  layout(
    clamp(
      (view.height - logo.top) /
        Math.max(1, Math.min(view.height * 0.75, footer.bottom - logo.top))
    )
  )

// A block whose logo has scrolled far above waits just over the viewport:
// on its way down to a rail or the footer it comes in from the top, not
// across the whole page. World units over the plane's middle.
export const ABOVE = VIEW_H * 0.75

// docs/design-brief.md › Главная на Swarm › На главной › Текст: a node in
// a text box (grown by `margin`) steps out to its nearest edge. Writes the
// step into `out` (x, y; CSS pixels), 0 outside every box.
export type Zone = Pick<DOMRect, "left" | "top" | "right" | "bottom">
export const TEXT_MARGIN = 30
export function stepOut(
  x: number,
  y: number,
  zones: readonly Zone[],
  count: number,
  out: Float32Array,
  margin = TEXT_MARGIN
) {
  out[0] = 0
  out[1] = 0
  for (let i = 0; i < count; i++) {
    const r = zones[i]
    const left = r.left - margin - x
    const right = r.right + margin - x
    const up = r.top - margin - y
    const down = r.bottom + margin - y
    if (left >= 0 || right <= 0 || up >= 0 || down <= 0) continue
    const sideways = -left < right ? left : right
    const vertical = -up < down ? up : down
    if (Math.abs(sideways) < Math.abs(vertical)) out[0] = sideways
    else out[1] = vertical
    return
  }
}
