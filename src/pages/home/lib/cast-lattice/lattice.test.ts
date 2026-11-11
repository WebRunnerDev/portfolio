import { describe, expect, it } from "vitest"

import { CELL, HALF, lattice, LIFT, PRESS, pressure, RADIUS } from "./lattice"

// Lays a lattice to the end, counting its slices.
function lay(width: number, height: number, reach?: number) {
  const cells = lattice(width, height, reach)
  let slices = 0
  let next = cells.next()
  while (!next.done) {
    slices++
    next = cells.next()
  }
  return { cells: next.value, slices }
}

// The cell nearest to (x, y).
function nearest(cells: Float32Array, x: number, y: number) {
  let best = 0
  for (let c = 0; c < cells.length / CELL; c++) {
    const d = Math.hypot(cells[c * CELL] - x, cells[c * CELL + 1] - y)
    const b = Math.hypot(cells[best * CELL] - x, cells[best * CELL + 1] - y)
    if (d < b) best = c
  }
  return best
}

// Steps `frames` frames of 16 ms with the pointer at `at`.
function run(
  press: ReturnType<typeof pressure>,
  at: { x: number; y: number } | null,
  frames: number
) {
  let moving = false
  for (let i = 0; i < frames; i++) moving = press.step(at, 16)
  return moving
}

describe("lattice", () => {
  it("covers the canvas with the static image's cells, one past each edge", () => {
    const { cells } = lay(480, 240)
    const xs = new Set<number>()
    for (let c = 0; c < cells.length / CELL; c++) {
      const x = cells[c * CELL]
      const y = cells[c * CELL + 1]
      // Centers between the lattice points: i + j odd.
      expect((x / HALF + y / HALF) % 2).not.toBe(0)
      xs.add(x)
      for (const pick of [cells[c * CELL + 2], cells[c * CELL + 3]]) {
        expect(pick).toBeGreaterThanOrEqual(0)
        expect(pick).toBeLessThan(1)
      }
    }
    expect(Math.min(...xs)).toBeLessThan(0)
    expect(Math.max(...xs)).toBeGreaterThan(480)
    // One cell per STEP² / 2 of area, give or take the bleed.
    expect(cells.length / CELL).toBeGreaterThan((480 * 240) / 1152)
  })

  it("reaches past the sides for the pitched field", () => {
    const { cells } = lay(480, 240, 100)
    const xs = [...cells].filter((_, k) => k % CELL === 0)
    expect(Math.min(...xs)).toBeLessThanOrEqual(-100)
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(580)
  })

  it("is laid in slices, the same each time", () => {
    const a = lay(2560, 1440)
    expect(a.slices).toBeGreaterThan(5)
    expect(lay(2560, 1440).cells).toEqual(a.cells)
  })
})

describe("pressure", () => {
  const { cells } = lay(960, 480)
  // The pointer over a cell's center: (21, 10).
  const at = { x: 504, y: 240 }

  it("rests flat without a pointer", () => {
    const press = pressure(cells)
    expect(run(press, null, 10)).toBe(false)
    expect(press.state.every((value) => value === 0)).toBe(true)
  })

  it("lifts the cells under the pointer and leans them away from it", () => {
    const press = pressure(cells)
    expect(run(press, at, 120)).toBe(true)
    const under = nearest(cells, at.x, at.y) * PRESS
    expect(press.state[under]).toBeGreaterThan(LIFT * 0.9)
    // Two cells to the right lean right, less lifted.
    const right = nearest(cells, at.x + 2 * HALF * 2, at.y) * PRESS
    expect(press.state[right]).toBeLessThan(press.state[under])
    expect(press.state[right + 1]).toBeGreaterThan(0)
    expect(Math.abs(press.state[right + 2])).toBeLessThan(1e-3)
    // Out of reach: flat.
    const far = nearest(cells, at.x + RADIUS + 2 * HALF, at.y) * PRESS
    expect(press.state[far]).toBe(0)
  })

  it("overshoots on the spring, then settles back when the pointer leaves", () => {
    const press = pressure(cells)
    const under = nearest(cells, at.x, at.y) * PRESS
    let peak = 0
    for (let i = 0; i < 60; i++) {
      press.step(at, 16)
      peak = Math.max(peak, press.state[under])
    }
    expect(peak).toBeGreaterThan(LIFT)
    expect(run(press, null, 300)).toBe(false)
    expect(Math.abs(press.state[under])).toBeLessThan(0.05)
    expect(press.state[under + 3]).toBeLessThan(0.05)
  })

  it("lights a few whole rhombi on the crest, never a fill", () => {
    const press = pressure(cells)
    run(press, at, 120)
    const crests: number[] = []
    for (let c = 0; c < cells.length / CELL; c++) {
      if (press.state[c * PRESS + 3] > 0.01)
        crests.push(press.state[c * PRESS + 3])
    }
    expect(crests.length).toBeGreaterThan(0)
    expect(crests.length).toBeLessThan(12)
    // A pointer at rest leaves them whole, not slivers.
    for (const crest of crests) expect(crest).toBeGreaterThan(0.99)
  })

  it("steps a long frame as a short one", () => {
    const press = pressure(cells)
    press.step(at, 5000)
    for (const value of press.state) expect(Number.isFinite(value)).toBe(true)
    expect(Math.max(...press.state)).toBeLessThan(LIFT)
  })
})
