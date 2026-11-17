import { clamp } from "./math"

// docs/design-brief.md › Главная на Swarm › Сцена › Сеть: the threads.
// Each is S segments, S + 1 points, taut between its two nodes. A wave
// runs along it across the line (`d`, in the page's plane) and in depth
// (`dz`), its ends held; `heat` is what crawlers left on each point.

export type Threads = {
  segments: number
  d: Float32Array
  v: Float32Array
  dz: Float32Array
  vz: Float32Array
  heat: Float32Array
  // Seconds until a pluck may send pulses again, per thread.
  cool: Float32Array
}

export function threads(count: number, segments: number): Threads {
  const points = count * (segments + 1)
  return {
    segments,
    d: new Float32Array(points),
    v: new Float32Array(points),
    dz: new Float32Array(points),
    vz: new Float32Array(points),
    heat: new Float32Array(points),
    cool: new Float32Array(count),
  }
}

// The wave: stiffness and damping per second, as in the spike.
const STIFF = 1900
const DAMP = 2.6
// How far a thread bends at most, a share of its length.
export const BEND = 0.16

// A pluck of thread `e` at point `k`: `impulse` across it, a bell over a
// few points around, its ends held. The point warms.
export function pluck(t: Threads, e: number, k: number, impulse: number) {
  const s = t.segments
  const o = e * (s + 1)
  for (let m = 1; m < s; m++) {
    const g = Math.exp(-((m - k) ** 2) / 3)
    t.v[o + m] += impulse * g
    t.vz[o + m] += Math.abs(impulse) * 0.5 * g
  }
  t.heat[o + k] = Math.max(t.heat[o + k], 0.9)
}

// A kick at the end of thread `e` that touches node `atA` (its a end) or
// its b end: a crawler landed there.
export function tremble(
  t: Threads,
  e: number,
  atA: boolean,
  across: number,
  depth: number
) {
  const s = t.segments
  const at = e * (s + 1) + (atA ? 1 : s - 1)
  t.v[at] += across
  t.vz[at] += depth
}

// `dt` seconds of the wave on thread `e`, `length` long, in two substeps
// (stable at the frame cap of 1/30 s); the ends stay at 0.
export function wave(t: Threads, e: number, dt: number, length: number) {
  const s = t.segments
  const o = e * (s + 1)
  const lim = length * BEND
  const { d, v, dz, vz } = t
  const h = dt / 2
  for (let sub = 0; sub < 2; sub++) {
    for (let m = o + 1; m < o + s; m++) {
      v[m] += (STIFF * (d[m - 1] - 2 * d[m] + d[m + 1]) - DAMP * v[m]) * h
      vz[m] += (STIFF * (dz[m - 1] - 2 * dz[m] + dz[m + 1]) - DAMP * vz[m]) * h
    }
    for (let m = o + 1; m < o + s; m++) {
      d[m] = clamp(d[m] + v[m] * h, -lim, lim)
      dz[m] = clamp(dz[m] + vz[m] * h, -lim, lim)
    }
  }
}

// Heat a crawler leaves at `u` (0–1 along thread `e`): `amount` split
// between the two points around it, `trail` more on the one ahead.
export function warm(
  t: Threads,
  e: number,
  u: number,
  amount: number,
  trail = 0
) {
  const s = t.segments
  const f = u * s
  const m = Math.min(s - 1, Math.floor(f))
  const fr = f - m
  const o = e * (s + 1) + m
  t.heat[o] = Math.max(t.heat[o], amount * (1 - fr))
  t.heat[o + 1] = Math.max(t.heat[o + 1], amount * fr + trail)
}

// The ribbon's buffers. Every point is two vertices (one each side), four
// floats each: x, y, z and heat. A thread's points go with its first and
// last doubled (S + 3 pairs), so one buffer read at three offsets gives
// each vertex its point and the points before and after it: no seams, the
// ends' directions their own.
export const FLOATS = 4
export const pairs = (segments: number) => segments + 3

// The static half: each vertex's place along its thread (u), its side and
// the thread's index. Indexed as the draw indexes the points.
export function ribbon(count: number, segments: number) {
  const per = pairs(segments)
  const info = new Float32Array(count * per * 2 * 3)
  const index = new Uint16Array(count * segments * 6)
  let k = 0
  for (let e = 0; e < count; e++) {
    for (let m = 0; m < per; m++) {
      for (let side = 0; side < 2; side++) {
        const at = ((e * per + m) * 2 + side) * 3
        info[at] = Math.min(m, segments) / segments
        info[at + 1] = side ? 1 : -1
        info[at + 2] = e
      }
    }
    for (let m = 0; m < segments; m++) {
      const o = (e * per + m) * 2
      index.set([o, o + 2, o + 1, o + 2, o + 3, o + 1], k)
      k += 6
    }
  }
  return { info, index }
}

// Thread `e` from A to B (xyz at 0 and 3 of `ends`) into `out` at `slot`
// (its own place unless asked): its points
// along the line, bent by its wave across it (in the page's plane) and in
// depth, each with `base` heat (how warm it stands) and its own. Allocates
// nothing: it runs for every thread every frame.
export function lay(
  t: Threads,
  e: number,
  ends: Float32Array,
  base: number,
  out: Float32Array,
  slot = e
) {
  const s = t.segments
  const o = e * (s + 1)
  const ax = ends[0]
  const ay = ends[1]
  const az = ends[2]
  const bx = ends[3]
  const by = ends[4]
  const bz = ends[5]
  let nx = ay - by
  let ny = bx - ax
  const nl = Math.hypot(nx, ny) || 1
  nx /= nl
  ny /= nl
  let at = slot * pairs(s) * 2 * FLOATS
  // Pairs -1 to S + 1: the first and last doubled.
  for (let pair = -1; pair <= s + 1; pair++) {
    const m = pair < 0 ? 0 : pair > s ? s : pair
    const u = m / s
    const bend = t.d[o + m]
    const x = ax + (bx - ax) * u + nx * bend
    const y = ay + (by - ay) * u + ny * bend
    const z = az + (bz - az) * u + t.dz[o + m]
    const heat = base + t.heat[o + m]
    for (let side = 0; side < 2; side++) {
      out[at] = x
      out[at + 1] = y
      out[at + 2] = z
      out[at + 3] = heat
      at += FLOATS
    }
  }
}
