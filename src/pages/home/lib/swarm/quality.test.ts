import { describe, expect, it } from "vitest"

import { DESKTOP, sizeK } from "./quality"

describe("sizeK", () => {
  it("draws the dust at its own size at desktop's count", () => {
    expect(sizeK(DESKTOP.perBlock)).toBe(1)
  })

  it("draws fewer particles larger, so a block doesn't thin out", () => {
    expect(sizeK(4500)).toBeCloseTo(2 ** 0.3, 5)
    expect(sizeK(2000)).toBeGreaterThan(sizeK(4500))
  })

  it("never draws them smaller than at desktop", () => {
    expect(sizeK(20000)).toBe(1)
  })
})
