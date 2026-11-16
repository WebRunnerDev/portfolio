// Column-major 4×4 matrices, as WebGL takes them: just what the Swarm's
// camera and its seven blocks need.
export type Mat4 = Float32Array

export const clamp = (v: number, lo = 0, hi = 1) =>
  Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
// Moves `from` toward `to` at `rate` per second, frame-rate independent.
export const damp = (from: number, to: number, rate: number, dt: number) =>
  lerp(from, to, 1 - Math.exp(-rate * dt))

// A perspective projection: vertical field of view `fov` (radians).
export function perspective(
  out: Mat4,
  fov: number,
  aspect: number,
  near: number,
  far: number
) {
  const f = 1 / Math.tan(fov / 2)
  out.fill(0)
  out[0] = f / aspect
  out[5] = f
  out[10] = (far + near) / (near - far)
  out[11] = -1
  out[14] = (2 * far * near) / (near - far)
  return out
}

// A camera at `eye` looking at `target`, up along +y.
export function lookAt(
  out: Mat4,
  [ex, ey, ez]: readonly number[],
  [tx, ty, tz]: readonly number[]
) {
  let zx = ex - tx
  let zy = ey - ty
  let zz = ez - tz
  const zl = Math.hypot(zx, zy, zz) || 1
  zx /= zl
  zy /= zl
  zz /= zl
  // x = up × z, with up = (0, 1, 0).
  let xx = zz
  let xz = -zx
  const xl = Math.hypot(xx, xz) || 1
  xx /= xl
  xz /= xl
  const yx = zy * xz
  const yy = zz * xx - zx * xz
  const yz = -zy * xx
  out.set([
    xx,
    yx,
    zx,
    0,
    0,
    yy,
    zy,
    0,
    xz,
    yz,
    zz,
    0,
    -(xx * ex + xz * ez),
    -(yx * ex + yy * ey + yz * ez),
    -(zx * ex + zy * ey + zz * ez),
    1,
  ])
  return out
}

export function multiply(out: Mat4, a: Mat4, b: Mat4) {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4]
    const b1 = b[c * 4 + 1]
    const b2 = b[c * 4 + 2]
    const b3 = b[c * 4 + 3]
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3
    }
  }
  return out
}

// Translation × rotation (Euler angles applied x, then y, then z, as
// three.js's "XYZ" order: R = Rx · Ry · Rz) × uniform scale, written into
// `out` at `offset`.
export function compose(
  out: Float32Array,
  offset: number,
  [px, py, pz]: readonly number[],
  [ax, ay, az]: readonly number[],
  s: number
) {
  const a = Math.cos(ax)
  const b = Math.sin(ax)
  const c = Math.cos(ay)
  const d = Math.sin(ay)
  const e = Math.cos(az)
  const f = Math.sin(az)
  const ae = a * e
  const af = a * f
  const be = b * e
  const bf = b * f
  out.set(
    [
      c * e * s,
      (af + be * d) * s,
      (bf - ae * d) * s,
      0,
      -c * f * s,
      (ae - bf * d) * s,
      (be + af * d) * s,
      0,
      d * s,
      -b * c * s,
      a * c * s,
      0,
      px,
      py,
      pz,
      1,
    ],
    offset
  )
  return out
}

// A CSS cubic-bezier(x1, y1, x2, y2) as a function of 0–1: the DESIGN.md
// curves (`EASE`) for the scene's own choreography.
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

// A deterministic generator in [0, 1): the same scene on every visit, so
// screenshots compare.
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
