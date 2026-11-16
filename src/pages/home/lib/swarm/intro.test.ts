import { describe, expect, it } from "vitest"

import { GATHER_DELAY_MS, GATHER_MS, intro, INTRO_MS } from "./intro"

describe("intro", () => {
  it("holds the dust scattered while the canvas fades in", () => {
    expect(intro(0, 5)).toEqual({ gather: 0, form: 0, path: 0, done: false })
    expect(intro(GATHER_DELAY_MS, 5).gather).toBe(0)
  })

  it("gathers on easing-layout, the readout walking the paths", () => {
    const half = intro(GATHER_DELAY_MS + GATHER_MS / 2, 5)
    expect(half.gather).toBeCloseTo(0.5)
    expect(half.path).toBe(2)
    expect(intro(GATHER_DELAY_MS + GATHER_MS * 0.99, 5).path).toBe(4)
  })

  it("is done once gathered", () => {
    expect(intro(INTRO_MS, 5)).toEqual({
      gather: 1,
      form: 1,
      path: -1,
      done: true,
    })
    expect(intro(INTRO_MS + 60_000, 5).done).toBe(true)
  })
})
