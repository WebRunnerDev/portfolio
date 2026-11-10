import { describe, expect, it } from "vitest"

import { flightStart } from "./logo-flight"

const box = (left: number, top: number, width: number, height = width) => ({
  left,
  top,
  width,
  bottom: top + height,
})

// The header logo's slot: 24px, at the start of a 56px header and its
// border; the hero's timeline sees the viewport below them.
const slot = box(48, 16, 24)
const view = (bottom: number) => ({ top: 57, bottom })

describe("flightStart", () => {
  it("starts over the tiles as the hero's top reaches the header", () => {
    // At the top of the page the hero fills the viewport below the header:
    // the flight starts at once, from where the tiles are.
    const hero = box(0, 57, 1440, 843)
    const tiles = box(1000, 357, 104)
    expect(flightStart(tiles, slot, hero, view(900))).toEqual({
      x: 952,
      y: 357 - 16,
      scale: 104 / 24,
    })
  })

  it("starts when a hero taller than the viewport shows its bottom", () => {
    const hero = box(0, 57, 320, 480)
    const tiles = box(200, 200, 44)
    // Its bottom (537) reaches the viewport's (400) 137px down.
    expect(flightStart(tiles, slot, hero, view(400)).y).toBe(200 - 137 - 16)
  })

  it("reads the same at any scroll", () => {
    const at = (scroll: number) =>
      flightStart(
        box(1000, 357 - scroll, 104),
        slot,
        box(0, 57 - scroll, 1440, 843),
        view(900)
      )
    expect(at(300)).toEqual(at(0))
  })

  // The tiles end the brand on the left, the slot starts the header on the
  // right: the logo comes from the left, unmirrored.
  it("comes from the tiles' side in RTL", () => {
    const rtlSlot = box(1368, 16, 24)
    const start = flightStart(
      box(200, 357, 104),
      rtlSlot,
      box(0, 57, 1440, 843),
      view(900)
    )
    expect(start.x).toBe(200 - 1368)
    expect(start.scale).toBeGreaterThan(0)
  })
})
