import { EASE } from "@/shared/lib/motion"

import { centers, waveStep } from "../tiles"
import { HALF } from "./lattice"
import { bezier } from "./pitch"

// The rise (docs/design-brief.md › Cast Lattice): as the hero starts to
// leave, seven cells come up out of the field and fly into the hero's logo
// tiles, left to right, on `easing-layout`. Each leaves the field a whole
// cell, lifts and leans on its way, shrinks to its tile and lands on it flat
// and in its color, under it: the tile covers it, and the header logo's
// flight goes on from there (@/shared/lib/logo-flight). Never mirrored.

// Values per copy, uploaded as they are: as a cell (x, y, two fixed numbers
// that light no crest), as its pressure (lift, lean, no crest), then its
// scale, how flat it is, how much of the tile's color and its opacity.
export const COPY = 12
export const COPIES = centers.length

// The logo's pattern in the field: a unit of the logo this many pixels, so
// its tiles land on seven different cells (they are 2√2 units apart at
// least, a cell's reach is HALF), DROP of the field's height under the logo.
const UNIT = 20
const DROP = 0.4
// Each copy's part of the rise: it starts by its column, SPREAD apart in
// all, and lands by LANDED, so all of them lie under the tiles a little
// before the flight takes over, whatever frame the scroll is in.
const SPREAD = 0.4
const LANDED = 0.9
const steps = Math.max(...waveStep)
// On its way a copy lifts by up to PEAK pixels and leans by up to LEAN
// toward where it goes.
const PEAK = 48
const LEAN = 0.6

const layout = bezier(EASE.layout)
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// The center of the lattice cell nearest to (x, y): cells sit at multiples
// of HALF where the two indices add up to an odd number.
export function nearestCell(x: number, y: number) {
  const i = Math.round(x / HALF)
  const j = Math.round(y / HALF)
  if ((i + j) % 2 !== 0) return { x: i * HALF, y: j * HALF }
  const dx = x / HALF - i
  const dy = y / HALF - j
  return Math.abs(dx) > Math.abs(dy)
    ? { x: (i + (dx < 0 ? -1 : 1)) * HALF, y: j * HALF }
    : { x: i * HALF, y: (j + (dy < 0 ? -1 : 1)) * HALF }
}

export type Logo = { left: number; top: number; width: number }

// The copies `progress` (0–1) through the rise, into `copies`, for the logo
// at `logo` on a canvas `height` tall (canvas pixels).
export function rise(
  copies: Float32Array,
  logo: Logo,
  height: number,
  progress: number
) {
  const unit = logo.width / 10
  const scale = (1.5 * unit) / HALF
  const middle = { x: logo.left + 5 * unit, y: logo.top + 5 * unit }
  const below = Math.min(middle.y + DROP * height, height - 2 * HALF)
  centers.forEach((center, k) => {
    const to = { x: logo.left + center.x * unit, y: logo.top + center.y * unit }
    const from = nearestCell(
      middle.x + (center.x - 5) * UNIT,
      below + (center.y - 5) * UNIT
    )
    const start = (waveStep[k] / steps) * SPREAD
    const t = Math.min(1, Math.max(0, (progress - start) / (LANDED - SPREAD)))
    const e = layout(t)
    const arc = Math.sin(Math.PI * t)
    const dx = to.x - from.x
    const dy = to.y - from.y
    const way = Math.hypot(dx, dy) || 1
    copies.set(
      [
        from.x + dx * e,
        from.y + dy * e,
        1,
        1,
        PEAK * arc,
        (LEAN * arc * dx) / way,
        (LEAN * arc * dy) / way,
        0,
        1 + (scale - 1) * e,
        smooth(0.7, 1, t),
        smooth(0.35, 0.95, t),
        smooth(0, 0.2, t),
      ],
      k * COPY
    )
  })
}
