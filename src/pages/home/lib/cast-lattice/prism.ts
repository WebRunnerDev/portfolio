import { HALF } from "./lattice"

// One cell's prism (docs/design-brief.md › Cast Lattice): a low rhombus with
// its top cut at 45° along the edges, like the chamfers of buttons and cards.
// The rim, where the cut meets the walls, is the cell's own rhombus at z = 0,
// so prisms at rest tile the plane as the static image's cells do; the top
// is BEVEL above it. The walls go down far enough that a prism at its full
// lift shows no gap under it.
export const BEVEL = 5
const TOP = HALF - BEVEL * Math.SQRT2
const WALL = 40

// Values per vertex: x, y, z (CSS pixels, y down, z toward the viewer), a
// wall flag, then the face's normal.
export const VERTEX = 7

// The corners' directions, clockwise on screen: right, down, left, up.
const CORNERS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
]

// Flat-shaded triangles: the top, then for each edge its bevel and its wall.
export function prism() {
  const v: number[] = []
  const quad = (corners: number[][], wall: number, normal: number[]) => {
    for (const k of [0, 1, 2, 0, 2, 3]) v.push(...corners[k], wall, ...normal)
  }
  quad(
    CORNERS.map(([x, y]) => [x * TOP, y * TOP, BEVEL]),
    0,
    [0, 0, 1]
  )
  CORNERS.forEach(([x0, y0], k) => {
    const [x1, y1] = CORNERS[(k + 1) % 4]
    // The edge's outward direction on the plane.
    const nx = (x0 + x1) / Math.SQRT2
    const ny = (y0 + y1) / Math.SQRT2
    quad(
      [
        [x0 * HALF, y0 * HALF, 0],
        [x1 * HALF, y1 * HALF, 0],
        [x1 * TOP, y1 * TOP, BEVEL],
        [x0 * TOP, y0 * TOP, BEVEL],
      ],
      0,
      [nx * Math.SQRT1_2, ny * Math.SQRT1_2, Math.SQRT1_2]
    )
    quad(
      [
        [x0 * HALF, y0 * HALF, -WALL],
        [x1 * HALF, y1 * HALF, -WALL],
        [x1 * HALF, y1 * HALF, 0],
        [x0 * HALF, y0 * HALF, 0],
      ],
      1,
      [nx, ny, 0]
    )
  })
  return new Float32Array(v)
}
