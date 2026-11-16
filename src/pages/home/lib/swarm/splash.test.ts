import { describe, expect, it } from "vitest"

import { compose } from "./math"
import { BLOCKS } from "./shaders"
import { splash, splashes } from "./splash"

const block = (turn: readonly number[] = [0, 0, 0], scale = 2) => {
  const m = new Float32Array(16)
  compose(m, 0, [3, -1, 0], turn, scale)
  return m
}

const direction = (s: ReturnType<typeof splashes>, i = 0) => [
  ...s.at.slice(i * 4, i * 4 + 3),
]

describe("splash", () => {
  it("starts with no splash on any block", () => {
    const s = splashes()
    expect(s.amp).toHaveLength(BLOCKS)
    for (let i = 0; i < BLOCKS; i++) {
      expect(s.amp[i]).toBe(0)
      expect(s.at[i * 4 + 3]).toBeLessThan(-10)
    }
  })

  it("blows the face toward the node it came from, in the block's space", () => {
    const s = splashes()
    expect(splash(s, 0, 1, 0.6, block(), 0, [-5, 0, 1])).toBe(true)
    const [x, y, z] = direction(s)
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5)
    expect(x).toBeLessThan(-0.9)
    expect(y).toBeCloseTo(0, 5)
    expect(s.at[3]).toBe(1)
    expect(s.amp[0]).toBeCloseTo(0.6)
  })

  it("turns the direction with the block", () => {
    const s = splashes()
    // A block turned half a turn about y faces away: a hit from the left
    // lands on its right side.
    splash(s, 0, 1, 0.6, block([0, Math.PI, 0]), 0, [-5, 0, 0])
    expect(direction(s)[0]).toBeGreaterThan(0.9)
  })

  it("keeps the burst on the block's front", () => {
    const s = splashes()
    splash(s, 0, 1, 0.6, block(), 0, [0, 0, -4])
    const [, , z] = direction(s)
    expect(z).toBeCloseTo(1, 5)
    splash(s, 1, 1, 0.6, block(), 0, [4, 0, -4])
    expect(direction(s, 1)[2]).toBeGreaterThanOrEqual(0.28)
  })

  it("comes from the light's side with no thread", () => {
    const s = splashes()
    splash(s, 2, 1, 1.1, block(), 0, null)
    const [x, y, z] = direction(s, 2)
    expect(x).toBeGreaterThan(0)
    expect(y).toBeGreaterThan(0)
    expect(z).toBeGreaterThan(0.8)
  })

  it("isn't restarted by a weaker splash while fresh", () => {
    const s = splashes()
    splash(s, 0, 1, 0.9, block(), 0, [-5, 0, 0])
    expect(splash(s, 0, 1.2, 0.6, block(), 0, [5, 0, 0])).toBe(false)
    expect(s.at[3]).toBe(1)
    expect(s.amp[0]).toBeCloseTo(0.9)
    // A stronger one does, and so does any once it has run a while.
    expect(splash(s, 0, 1.3, 1.1, block(), 0, [5, 0, 0])).toBe(true)
    expect(splash(s, 0, 2, 0.5, block(), 0, [5, 0, 0])).toBe(true)
    expect(s.amp[0]).toBeCloseTo(0.5)
  })
})
