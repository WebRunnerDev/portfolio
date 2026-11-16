import { centers } from "../tiles"
import { HALF_DIAGONAL } from "./dust"
import { lerp } from "./math"

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
