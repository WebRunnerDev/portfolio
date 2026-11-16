import { BLOCKS } from "./shaders"

// docs/design-brief.md › Главная на Swarm › Сцена › Узлы: what lands on a
// block blows the dust off the face its thread comes in by. A splash is a
// direction in the block's own space and the time it came; the dust shader
// runs the wave over the surface from there, the burst at the face and the
// rust flash, then lets the dust settle back.
export type Splashes = {
  // Per block: the direction it came from (x, y, z) and when (s).
  at: Float32Array
  // Per block: how strong.
  amp: Float32Array
}

// A splash this young isn't restarted by one no stronger (s).
const FRESH = 0.5
// Toward the block's front (its +z, which faces the camera) at least this
// much, so the burst shows.
const FRONT = 0.3
// Where a splash with no thread comes from (world): the key light's side.
const AHEAD = [0.25, 0.35, 1]

export function splashes(): Splashes {
  const at = new Float32Array(BLOCKS * 4)
  for (let i = 0; i < BLOCKS; i++) at[i * 4 + 3] = -99
  return { at, amp: new Float32Array(BLOCKS) }
}

// A splash of `amp` on block `i` at `t`, from the world direction `d` (or
// none), the block placed by `m` (column-major, at `offset`). The direction
// goes into the block's space by the transpose of its rotation, turned
// toward its front. False when a fresh, stronger splash is still running.
export function splash(
  s: Splashes,
  i: number,
  t: number,
  amp: number,
  m: Float32Array,
  offset: number,
  d: ArrayLike<number> | null
) {
  const o = i * 4
  if (t - s.at[o + 3] < FRESH && amp <= s.amp[i]) return false
  const v = d ?? AHEAD
  const [wx, wy, wz] = [v[0], v[1], v[2]]
  let x = m[offset] * wx + m[offset + 1] * wy + m[offset + 2] * wz
  let y = m[offset + 4] * wx + m[offset + 5] * wy + m[offset + 6] * wz
  let z = m[offset + 8] * wx + m[offset + 9] * wy + m[offset + 10] * wz
  let l = Math.hypot(x, y, z)
  if (l < 1e-6) {
    x = 0
    y = 0
    z = 1
    l = 1
  }
  x /= l
  y /= l
  z = Math.max(z / l, FRONT)
  l = Math.hypot(x, y, z)
  s.at[o] = x / l
  s.at[o + 1] = y / l
  s.at[o + 2] = z / l
  s.at[o + 3] = t
  s.amp[i] = amp
  return true
}
