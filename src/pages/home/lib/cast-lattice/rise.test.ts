import { describe, expect, it } from "vitest"

import { centers } from "../tiles"
import { HALF } from "./lattice"
import { COPIES, COPY, nearestCell, rise } from "./rise"

const logo = { left: 1000, top: 300, width: 104 }
const at = (progress: number) => {
  const copies = new Float32Array(COPIES * COPY)
  rise(copies, logo, 843, progress)
  return [...Array(COPIES).keys()].map((k) =>
    copies.slice(k * COPY, (k + 1) * COPY)
  )
}

describe("nearestCell", () => {
  it("is a cell's center within a cell's reach", () => {
    for (const [x, y] of [
      [0, 0],
      [13, 37],
      [-50, 71],
      [24, 24],
    ]) {
      const cell = nearestCell(x, y)
      expect((cell.x / HALF + cell.y / HALF) % 2).not.toBe(0)
      expect(Math.abs(cell.x - x) + Math.abs(cell.y - y)).toBeLessThanOrEqual(
        HALF
      )
    }
  })
})

describe("rise", () => {
  it("starts on seven cells under the logo, unseen", () => {
    const copies = at(0)
    const cells = new Set(copies.map((c) => `${c[0]},${c[1]}`))
    expect(cells.size).toBe(7)
    for (const c of copies) {
      expect((c[0] / HALF + c[1] / HALF) % 2).not.toBe(0)
      expect(c[1]).toBeGreaterThan(logo.top + logo.width)
      // A whole cell, at rest, transparent.
      expect([c[4], c[8], c[9], c[11]]).toEqual([0, 1, 0, 0])
    }
  })

  // The header logo's flight goes on from there: no jump in place or color.
  it("lands on the logo's tiles, flat, in their color and size", () => {
    const unit = logo.width / 10
    expect(at(0.9)).toEqual(at(1))
    at(1).forEach((c, k) => {
      expect(c[0]).toBeCloseTo(logo.left + centers[k].x * unit)
      expect(c[1]).toBeCloseTo(logo.top + centers[k].y * unit)
      expect(c[4]).toBeCloseTo(0)
      expect(c[5]).toBeCloseTo(0)
      expect(c[6]).toBeCloseTo(0)
      // The rhombus 3 units across, flat, the tile's color, opaque.
      expect(c[8] * HALF).toBeCloseTo(1.5 * unit)
      expect([c[9], c[10], c[11]]).toEqual([1, 1, 1])
    })
  })

  it("rises left to right, lifted on its way", () => {
    const copies = at(0.3)
    const leftmost = centers.reduce(
      (a, b, k) => (b.x < centers[a].x ? k : a),
      0
    )
    const rightmost = centers.reduce(
      (a, b, k) => (b.x > centers[a].x ? k : a),
      0
    )
    expect(copies[leftmost][4]).toBeGreaterThan(copies[rightmost][4])
    expect(Math.max(...copies.map((c) => c[4]))).toBeGreaterThan(10)
  })
})
