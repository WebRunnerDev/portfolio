import { EASE } from "@/shared/lib/motion"

// The pitch of the Cast Lattice as the hero leaves (docs/design-brief.md ›
// Cast Lattice): the field turns about its bottom edge, its top away from
// the camera, by up to PITCH over the hero's exit, on `easing-layout`. The
// camera stays over the canvas's center at `distance`; at z = 0 one unit is
// one CSS pixel, so the field at rest lies where the static image's does.
export const PITCH = (50 * Math.PI) / 180

// A CSS cubic-bezier(x1, y1, x2, y2) as a function of 0–1.
export function bezier([x1, y1, x2, y2]: readonly number[]) {
  const at = (a: number, b: number, t: number) =>
    3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t * t + t ** 3
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    // Bisection: x(t) rises with t for any curve CSS allows.
    let lo = 0
    let hi = 1
    for (let k = 0; k < 24; k++) {
      const t = (lo + hi) / 2
      if (at(x1, x2, t) < x) lo = t
      else hi = t
    }
    return at(y1, y2, (lo + hi) / 2)
  }
}

const layout = bezier(EASE.layout)

// The field's pitch `progress` into the hero's exit.
export const pitchAt = (progress: number) => PITCH * layout(progress)

export type Camera = {
  width: number
  height: number
  distance: number
  pitch: number
}

// Where the point (x, y) of the field, at z = 0, shows on the canvas.
export function project(
  { width, height, distance, pitch }: Camera,
  x: number,
  y: number
) {
  const z = (y - height) * Math.sin(pitch)
  const turned = height + (y - height) * Math.cos(pitch)
  const scale = distance / (distance - z)
  return {
    x: width / 2 + (x - width / 2) * scale,
    y: height / 2 + (turned - height / 2) * scale,
  }
}

// The point of the field, at z = 0, that shows at (x, y) on the canvas: the
// pointer's place on the pitched field. Null past its horizon.
export function unproject(
  { width, height, distance, pitch }: Camera,
  x: number,
  y: number
) {
  const c = Math.cos(pitch)
  const s = Math.sin(pitch)
  const cx = width / 2
  const cy = height / 2
  // The ray from the camera through (x, y), where it meets the field.
  const across = s * (y - cy) + c * distance
  if (across <= 0) return null
  const t = (c * distance - s * (cy - height)) / across
  const py = cy + t * (y - cy)
  const pz = distance * (1 - t)
  return {
    x: cx + t * (x - cx),
    y: height + (py - height) * c + pz * s,
  }
}
