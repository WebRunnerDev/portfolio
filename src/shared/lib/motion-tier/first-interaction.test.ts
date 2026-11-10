import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// An input event; a pointer that moved, unless told otherwise.
const input = (type: string, movementX = 1) =>
  Object.assign(new Event(type), { movementX, movementY: 0 })

// The gate is open or not for the whole visit: a fresh module per test.
async function gate() {
  vi.resetModules()
  return import("./first-interaction")
}

beforeEach(() => {
  vi.stubGlobal("window", new EventTarget())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("onFirstInteraction", () => {
  it.each(["pointermove", "pointerdown", "wheel", "touchstart", "keydown"])(
    "opens on %s, once",
    async (type) => {
      const { hadFirstInteraction, onFirstInteraction } = await gate()
      const callback = vi.fn()
      onFirstInteraction(callback)
      expect(hadFirstInteraction()).toBe(false)
      window.dispatchEvent(input(type))
      window.dispatchEvent(input(type))
      expect(callback).toHaveBeenCalledOnce()
      expect(hadFirstInteraction()).toBe(true)
    }
  )

  it.each(["scroll", "resize"])("stays shut on %s", async (type) => {
    const { hadFirstInteraction, onFirstInteraction } = await gate()
    const callback = vi.fn()
    onFirstInteraction(callback)
    window.dispatchEvent(input(type))
    expect(callback).not.toHaveBeenCalled()
    expect(hadFirstInteraction()).toBe(false)
  })

  it("stays shut on a pointermove that didn't move (Chrome's hover update)", async () => {
    const { hadFirstInteraction, onFirstInteraction } = await gate()
    const callback = vi.fn()
    onFirstInteraction(callback)
    window.dispatchEvent(input("pointermove", 0))
    expect(callback).not.toHaveBeenCalled()
    expect(hadFirstInteraction()).toBe(false)
  })

  it("calls at once once open, and not after unsubscribing", async () => {
    const { onFirstInteraction } = await gate()
    const gone = vi.fn()
    onFirstInteraction(gone)()
    window.dispatchEvent(input("keydown"))
    expect(gone).not.toHaveBeenCalled()

    const late = vi.fn()
    onFirstInteraction(late)
    expect(late).toHaveBeenCalledOnce()
  })
})
