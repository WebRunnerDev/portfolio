import { describe, expect, it } from "vitest"

import { centers } from "../tiles"
import { HALF_DIAGONAL } from "./dust"
import { gatherSlot, logoSlot, stepOut, toWorld, VIEW_H } from "./layout"

const view = { width: 1600, height: 900 }
const logo = { left: 1000, top: 200, width: 500, height: 500 }

describe("toWorld", () => {
  it("maps the viewport onto the plane, y up", () => {
    const middle = toWorld(view, 800, 450)
    expect(middle.x).toBeCloseTo(0)
    expect(middle.y).toBeCloseTo(0)
    const corner = toWorld(view, 0, 0)
    expect(corner.y).toBeCloseTo(VIEW_H / 2)
    expect(corner.x).toBeCloseTo((-VIEW_H / 2) * (1600 / 900))
  })
})

describe("logoSlot", () => {
  it("puts each block on its tile, the size of the tile", () => {
    for (let i = 0; i < centers.length; i++) {
      const slot = logoSlot(view, logo, i)
      const at = toWorld(
        view,
        1000 + centers[i].x * 50,
        200 + centers[i].y * 50
      )
      expect(slot.x).toBeCloseTo(at.x)
      expect(slot.y).toBeCloseTo(at.y)
      // A tile's half-diagonal is 1.5 logo units: 75px here, a little less.
      const half = slot.scale * HALF_DIAGONAL * (900 / VIEW_H)
      expect(half).toBeCloseTo(75 * 0.9)
    }
  })
})

describe("gatherSlot", () => {
  it("ends in the logo", () => {
    const end = gatherSlot(view, logo, 3, 1)
    const slot = logoSlot(view, logo, 3)
    for (const key of ["x", "y", "scale"] as const) {
      expect(end[key]).toBeCloseTo(slot[key])
    }
  })

  it("starts spread out and smaller", () => {
    const from = gatherSlot(view, logo, 2, 0)
    const to = logoSlot(view, logo, 2)
    expect(from.scale).toBeLessThan(to.scale)
    expect(Math.hypot(from.x - to.x, from.y - to.y)).toBeGreaterThan(1)
  })
})

describe("stepOut", () => {
  const zones = [{ left: 100, top: 100, right: 400, bottom: 200 }]
  const out = new Float32Array(2)

  it("steps a node in a text box out to its nearest edge", () => {
    stepOut(120, 150, zones, 1, out, 0)
    expect([...out]).toEqual([-20, 0])
    stepOut(250, 190, zones, 1, out, 0)
    expect([...out]).toEqual([0, 10])
  })

  it("keeps the margin and leaves nodes outside alone", () => {
    stepOut(250, 90, zones, 1, out, 30)
    expect([...out]).toEqual([0, -20])
    stepOut(50, 50, zones, 1, out, 30)
    expect([...out]).toEqual([0, 0])
    // Only the first `count` zones count.
    stepOut(250, 150, zones, 0, out, 30)
    expect([...out]).toEqual([0, 0])
  })
})
