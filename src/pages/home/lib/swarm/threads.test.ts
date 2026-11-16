import { describe, expect, it } from "vitest"

import {
  BEND,
  FLOATS,
  lay,
  pairs,
  pluck,
  ribbon,
  threads,
  tremble,
  warm,
  wave,
} from "./threads"

const S = 14

describe("pluck and wave", () => {
  it("bends the thread where plucked, its ends held", () => {
    const t = threads(2, S)
    pluck(t, 1, 7, 4)
    for (let i = 0; i < 20; i++) wave(t, 1, 1 / 60, 5)
    const o = S + 1
    expect(t.d[o]).toBe(0)
    expect(t.d[o + S]).toBe(0)
    expect(Math.abs(t.d[o + 7])).toBeGreaterThan(0.01)
    // The other thread doesn't move.
    expect(t.d.slice(0, S + 1).every((d) => d === 0)).toBe(true)
    expect(t.heat[o + 7]).toBeCloseTo(0.9)
  })

  it("never bends further than its share of the length", () => {
    const t = threads(1, S)
    pluck(t, 0, 7, 600)
    for (let i = 0; i < 10; i++) wave(t, 0, 1 / 30, 2)
    for (const d of t.d)
      expect(Math.abs(d)).toBeLessThanOrEqual(2 * BEND + 1e-6)
  })

  it("settles back, stable at the frame cap", () => {
    const t = threads(1, S)
    pluck(t, 0, 4, 6)
    tremble(t, 0, true, 1, 1)
    for (let i = 0; i < 60 * 8; i++) wave(t, 0, 1 / 30, 5)
    for (const d of t.d) expect(Math.abs(d)).toBeLessThan(0.01)
  })
})

describe("warm", () => {
  it("leaves heat on the two points around u", () => {
    const t = threads(1, S)
    warm(t, 0, 0.5, 0.6)
    expect(t.heat[7]).toBeCloseTo(0.6)
    expect(t.heat[8]).toBeCloseTo(0)
    warm(t, 0, 0.75 / S, 1, 0.2)
    expect(t.heat[0]).toBeCloseTo(0.25)
    expect(t.heat[1]).toBeCloseTo(0.95)
  })
})

describe("ribbon and lay", () => {
  it("indexes two triangles a segment, side by side along the thread", () => {
    const { info, index } = ribbon(3, S)
    expect(index.length).toBe(3 * S * 6)
    expect(info.length).toBe(3 * pairs(S) * 2 * 3)
    // The last vertex any draw reads, at the next point's offset, is in
    // the buffer.
    expect(Math.max(...index) + 4).toBeLessThan(3 * pairs(S) * 2)
    // Vertex 2m + side of thread e: u = m / S, side ±1, thread e.
    const at = ((2 * pairs(S) + 5) * 2 + 1) * 3
    expect(info[at]).toBeCloseTo(5 / S)
    expect([...info.slice(at + 1, at + 3)]).toEqual([1, 2])
  })

  it("lays a straight thread between its ends, the first and last doubled", () => {
    const t = threads(2, S)
    const out = new Float32Array(2 * pairs(S) * 2 * FLOATS)
    lay(t, 1, Float32Array.of(0, 0, 0, 2, 0, -1), 0.1, out)
    const point = (pair: number) => {
      const at = (pairs(S) + pair) * 2 * FLOATS
      return [...out.slice(at, at + FLOATS)]
    }
    expect(point(0)).toEqual(point(1))
    expect(point(pairs(S) - 1)).toEqual(point(pairs(S) - 2))
    expect(point(1)[0]).toBeCloseTo(0)
    expect(point(1 + S)[0]).toBeCloseTo(2)
    expect(point(1 + S / 2)).toEqual([1, 0, -0.5, Math.fround(0.1)])
    // Both sides of a point are the same point.
    const at = (pairs(S) + 3) * 2 * FLOATS
    expect([...out.slice(at, at + FLOATS)]).toEqual([
      ...out.slice(at + FLOATS, at + 2 * FLOATS),
    ])
    // Thread 0 is untouched.
    expect(out.slice(0, pairs(S) * 2 * FLOATS).every((v) => v === 0)).toBe(true)
  })
})
