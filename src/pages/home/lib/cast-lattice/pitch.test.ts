import { describe, expect, it } from "vitest"

import { EASE } from "@/shared/lib/motion"

import { bezier, PITCH, pitchAt, project, unproject } from "./pitch"

const camera = (pitch: number) => ({
  width: 1440,
  height: 843,
  distance: 1.6 * 843,
  pitch,
})

describe("bezier", () => {
  it("is the CSS curve", () => {
    const layout = bezier(EASE.layout)
    expect(layout(0)).toBe(0)
    expect(layout(1)).toBe(1)
    // Symmetric: an in-out curve.
    expect(layout(0.5)).toBeCloseTo(0.5)
    expect(layout(0.3) + layout(0.7)).toBeCloseTo(1)
    // expo in-out: slow at both ends.
    expect(layout(0.2)).toBeLessThan(0.05)
  })
})

describe("pitchAt", () => {
  it("pitches over the hero's exit on easing-layout", () => {
    expect(pitchAt(0)).toBe(0)
    expect(pitchAt(0.5)).toBeCloseTo(PITCH / 2)
    expect(pitchAt(1)).toBe(PITCH)
  })
})

describe("project", () => {
  it("leaves the field at rest where it is", () => {
    expect(project(camera(0), 100, 200)).toEqual({ x: 100, y: 200 })
  })

  it("turns the field away about its bottom edge", () => {
    const tilted = camera(PITCH)
    const bottom = project(tilted, 100, 843)
    expect(bottom.x).toBeCloseTo(100)
    expect(bottom.y).toBeCloseTo(843)
    // Higher up the field is farther: lower on the canvas, nearer its middle.
    const top = project(tilted, 100, 0)
    expect(top.y).toBeGreaterThan(0)
    expect(top.x).toBeGreaterThan(100)
  })
})

describe("unproject", () => {
  it("finds the field's point under the canvas's", () => {
    for (const pitch of [0, 0.3, PITCH]) {
      const view = camera(pitch)
      for (const [x, y] of [
        [0, 0],
        [1440, 400],
        [700, 843],
      ]) {
        const shown = project(view, x, y)
        const back = unproject(view, shown.x, shown.y)!
        expect(back.x).toBeCloseTo(x)
        expect(back.y).toBeCloseTo(y)
      }
    }
  })
})
