import { rng } from "./math"

// docs/design-brief.md › Главная на Swarm › Сцена: every node is a rounded
// rhombus of dust. A particle has a home on (or, for some, inside) that
// shape in the node's own space, a normal it is lit by, the node it belongs
// to and four random numbers of its own.
//
// Interleaved per particle: home xyz, normal xyz (its length is how lit the
// particle is: inner dust is dimmer), node, seed xyzw.
export const PARTICLE = 11

// The shape: a superellipsoid |u/a|^n + |v/a|^n + |z/c|^n = 1 turned 45°
// about z, so its flat faces are the logo tile's four sides and its edges
// round off. Its half-diagonal on screen is ≈ 1.19 units (`HALF_DIAGONAL`).
const N = 8
const A = 0.84
const C = 0.6
export const HALF_DIAGONAL = A * Math.SQRT2
// The share of a block's dust that sits inside it: it dims the faces'
// edges and gives the block depth.
const INNER = 0.22

const radius = (u: number, v: number, z: number) =>
  (Math.abs(u / A) ** N + Math.abs(v / A) ** N + Math.abs(z / C) ** N) **
  (-1 / N)

// A point on the shape, roughly uniform by area, and its normal.
export function shapePoint(random: () => number) {
  const side = 4 * A * C
  const cap = 4 * A * A
  const f = random() * (4 * side + 2 * cap)
  const s1 = random() * 2 - 1
  const s2 = random() * 2 - 1
  let u: number
  let v: number
  let z: number
  if (f < 2 * side) {
    u = f < side ? A : -A
    v = s1 * A
    z = s2 * C
  } else if (f < 4 * side) {
    v = f < 3 * side ? A : -A
    u = s1 * A
    z = s2 * C
  } else {
    z = f < 4 * side + cap ? C : -C
    u = s1 * A
    v = s2 * A
  }
  // Onto the rounded surface along the ray from the center.
  const l = Math.hypot(u, v, z)
  const r = radius(u / l, v / l, z / l)
  u = (u / l) * r
  v = (v / l) * r
  z = (z / l) * r
  // The gradient is the normal.
  const gu = (Math.sign(u) * Math.abs(u / A) ** (N - 1)) / A
  const gv = (Math.sign(v) * Math.abs(v / A) ** (N - 1)) / A
  const gz = (Math.sign(z) * Math.abs(z / C) ** (N - 1)) / C
  const nx = (gu + gv) * Math.SQRT1_2
  const ny = (gu - gv) * Math.SQRT1_2
  const nl = Math.hypot(nx, ny, gz) || 1
  return [
    (u + v) * Math.SQRT1_2,
    (u - v) * Math.SQRT1_2,
    z,
    nx / nl,
    ny / nl,
    gz / nl,
  ]
}

// The dust of `blocks` blocks, `perBlock` particles each, and of `far` far
// nodes (numbered from `first`, after the blocks unless asked), `perFar`
// each, laid in slices of `slice` particles so no long task lands on an
// input: yields after every slice, returns the buffer. Particles go round the nodes (particle i of
// every node, then i + 1), so the first k rounds hold the first k of each
// node: drawing fewer is a shorter draw range. A far node is a shell.
export function* dust(
  blocks: number,
  perBlock: number,
  far = 0,
  perFar = 0,
  slice = 8192,
  first = blocks
) {
  // Far nodes numbered elsewhere get dust of their own.
  const random = rng(19 + first - blocks)
  const out = new Float32Array((blocks * perBlock + far * perFar) * PARTICLE)
  let k = 0
  const put = (node: number, block: boolean) => {
    const [x, y, z, nx, ny, nz] = shapePoint(random)
    const inner = block && random() < INNER
    const depth = inner ? 0.35 + 0.55 * Math.cbrt(random()) : 1
    const lit = inner ? 0.35 + 0.3 * depth : 1
    out.set(
      [
        x * depth,
        y * depth,
        z * depth,
        nx * lit,
        ny * lit,
        nz * lit,
        node,
        random(),
        random(),
        random(),
        random(),
      ],
      k * PARTICLE
    )
    return ++k % slice === 0
  }
  for (let i = 0; i < Math.max(perBlock, perFar); i++) {
    if (i < perBlock) {
      for (let node = 0; node < blocks; node++) {
        if (put(node, true)) yield
      }
    }
    if (i < perFar) {
      for (let node = first; node < first + far; node++) {
        if (put(node, false)) yield
      }
    }
  }
  return out
}
