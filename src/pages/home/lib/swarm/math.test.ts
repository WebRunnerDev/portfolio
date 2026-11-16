import { describe, expect, it } from "vitest"

import { EASE } from "@/shared/lib/motion"

import { bezier, compose, lookAt, multiply, perspective } from "./math"

const apply = (m: Float32Array, [x, y, z]: number[]) => {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15]
  return [0, 1, 2].map(
    (r) => (m[r] * x + m[4 + r] * y + m[8 + r] * z + m[12 + r]) / w
  )
}

describe("compose", () => {
  it("scales, turns x then y then z, and moves", () => {
    const m = compose(new Float32Array(16), 0, [1, 2, 3], [0, 0, 0], 2)
    expect(apply(m, [1, 0, 0])).toEqual([3, 2, 3])
    // A quarter turn about y takes +x to -z.
    const turned = compose(
      new Float32Array(16),
      0,
      [0, 0, 0],
      [0, Math.PI / 2, 0],
      1
    )
    const [x, y, z] = apply(turned, [1, 0, 0])
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(0)
    expect(z).toBeCloseTo(-1)
  })

  it("writes at its offset", () => {
    const out = new Float32Array(32)
    compose(out, 16, [5, 0, 0], [0, 0, 0], 1)
    expect(out[12]).toBe(0)
    expect(out[16 + 12]).toBe(5)
  })
})

describe("the camera", () => {
  it("puts what it looks at in the middle of the screen", () => {
    const projection = perspective(new Float32Array(16), 0.5, 16 / 9, 0.1, 200)
    const view = lookAt(new Float32Array(16), [0.4, -0.2, 24], [0.24, -0.12, 0])
    const [x, y] = apply(
      multiply(new Float32Array(16), projection, view),
      [0.24, -0.12, 0]
    )
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(0)
  })
})

describe("bezier", () => {
  it("is the CSS curve", () => {
    const layout = bezier(EASE.layout)
    expect(layout(0)).toBe(0)
    expect(layout(1)).toBe(1)
    // Symmetric: an in-out curve.
    expect(layout(0.5)).toBeCloseTo(0.5)
    expect(layout(0.3) + layout(0.7)).toBeCloseTo(1)
    // Slow at both ends.
    expect(layout(0.2)).toBeLessThan(0.05)
  })
})
