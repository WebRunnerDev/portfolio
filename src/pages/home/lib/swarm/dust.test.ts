import { describe, expect, it } from "vitest"

import { dust, HALF_DIAGONAL, PARTICLE, shapePoint } from "./dust"
import { rng } from "./math"

const run = <T>(slices: Generator<unknown, T>) => {
  let step = slices.next()
  let yields = 0
  while (!step.done) {
    yields++
    step = slices.next()
  }
  return { value: step.value, yields }
}

describe("shapePoint", () => {
  it("lies on the rounded rhombus, its normal of unit length", () => {
    const random = rng(1)
    for (let i = 0; i < 500; i++) {
      const [x, y, z, nx, ny, nz] = shapePoint(random)
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1)
      // Within the rhombus |x| + |y| ≤ its half-diagonal, a little rounder.
      expect(Math.abs(x) + Math.abs(y)).toBeLessThanOrEqual(
        HALF_DIAGONAL + 1e-6
      )
      expect(Math.abs(z)).toBeLessThanOrEqual(0.6 + 1e-6)
      // The normal points out.
      expect(x * nx + y * ny + z * nz).toBeGreaterThan(0)
    }
  })
})

describe("dust", () => {
  it("lays every block's particles, round the blocks", () => {
    const { value } = run(dust(7, 100))
    expect(value.length).toBe(7 * 100 * PARTICLE)
    // Particle k belongs to block k mod 7: the first k × 7 hold k of each.
    for (let k = 0; k < 21; k++) expect(value[k * PARTICLE + 6]).toBe(k % 7)
  })

  it("gives the same dust on every visit", () => {
    expect(run(dust(7, 50)).value).toEqual(run(dust(7, 50)).value)
  })

  it("lays far nodes after the blocks, a shell each, round the nodes", () => {
    const { value } = run(dust(7, 100, 3, 10))
    expect(value.length).toBe((7 * 100 + 3 * 10) * PARTICLE)
    // A round: 7 blocks, then the 3 far nodes, while they have particles.
    const node = (k: number) => value[k * PARTICLE + 6]
    expect([...Array(20).keys()].map(node)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ])
    expect(node(10 * 10)).toBe(0)
    // On the surface: normals of unit length.
    for (let k = 7; k < 10; k++) {
      const at = k * PARTICLE
      expect(
        Math.hypot(value[at + 3], value[at + 4], value[at + 5])
      ).toBeCloseTo(1)
    }
  })

  it("keeps the blocks' dust as it was without far nodes", () => {
    const blocks = run(dust(7, 50)).value
    const both = run(dust(7, 50, 3, 0)).value
    expect(both).toEqual(blocks)
  })

  it("numbers far nodes from where it is told, with dust of their own", () => {
    const { value } = run(dust(0, 0, 3, 10, undefined, 40))
    expect(value.length).toBe(3 * 10 * PARTICLE)
    const node = (k: number) => value[k * PARTICLE + 6]
    expect([0, 1, 2, 3].map(node)).toEqual([40, 41, 42, 40])
    const after = run(dust(7, 0, 3, 10)).value
    expect(value.slice(0, 6)).not.toEqual(after.slice(0, 6))
  })

  it("yields between slices", () => {
    expect(run(dust(7, 1000, 0, 0, 1000)).yields).toBe(7)
  })
})
