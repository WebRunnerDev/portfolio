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

  it("yields between slices", () => {
    expect(run(dust(7, 1000, 1000)).yields).toBe(7)
  })
})
