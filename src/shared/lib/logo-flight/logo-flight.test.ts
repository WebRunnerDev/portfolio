import { describe, expect, it } from "vitest"

import { exitProgress, flightStart, riseShare } from "./logo-flight"

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

describe("exitProgress", () => {
  it("runs over the hero's height as its top passes the header", () => {
    const at = (scroll: number) =>
      exitProgress(box(0, 57 - scroll, 1440, 843), view(900))
    expect(at(0)).toBe(0)
    expect(at(843 / 4)).toBeCloseTo(0.25)
    expect(at(843)).toBe(1)
    expect(at(2000)).toBe(1)
  })

  it("runs over the view's height once a taller hero shows its bottom", () => {
    // The hero is 480px tall, the view 343px: the exit starts 137px down.
    const at = (scroll: number) =>
      exitProgress(box(0, 57 - scroll, 320, 480), view(400))
    expect(at(100)).toBe(0)
    expect(at(137 + 343 / 2)).toBeCloseTo(0.5)
  })
})

describe("riseShare", () => {
  it("takes the first part of the exit when the tiles are low enough", () => {
    expect(
      riseShare(box(1000, 457, 104), box(0, 57, 1440, 843), view(900))
    ).toBe(0.3)
  })

  // At 25% of the way the tiles would still be 3/4 of 80px from the header.
  it("keeps the tiles off the header", () => {
    const hero = box(0, 57, 320, 480)
    const share = riseShare(box(200, 137, 44), hero, view(537))
    expect(share).toBeCloseTo((0.75 * 80) / 480)
    const tiles = box(200, 137, 44)
    const start = flightStart(tiles, slot, hero, view(537), share)
    expect(start.y + slot.top).toBeCloseTo(57 + 20)
  })

  it("reads the same at any scroll", () => {
    const at = (scroll: number) =>
      riseShare(
        box(200, 300 - scroll, 44),
        box(0, 57 - scroll, 320, 480),
        view(400)
      )
    expect(at(150)).toBeCloseTo(at(0))
  })
})

describe("flightStart after the rise", () => {
  it("starts where the tiles are that far into the exit", () => {
    const hero = box(0, 57, 1440, 843)
    const tiles = box(1000, 357, 104)
    expect(flightStart(tiles, slot, hero, view(900), 0.3).y).toBeCloseTo(
      357 - 0.3 * 843 - 16
    )
  })
})
