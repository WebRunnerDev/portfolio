import { describe, expect, it, vi } from "vitest"
import type { LenisOptions } from "lenis"

import {
  LERP,
  weightedScroll,
  type WeightedLenis,
  type WeightedScrollEnv,
} from "./weighted-scroll"

// A Lenis that records what it was told, gliding or not as the test says.
class FakeLenis implements WeightedLenis {
  static last: FakeLenis
  isScrolling: WeightedLenis["isScrolling"] = false
  actualScroll = 0
  animatedScroll = 0
  time = 0
  raf = vi.fn((time: number) => {
    this.time = time
  })
  wheel = new Set<() => void>()
  on = (_event: "virtual-scroll", callback: () => void) => {
    this.wheel.add(callback)
    return () => this.wheel.delete(callback)
  }
  stop = vi.fn(() => {
    this.isScrolling = false
    this.animatedScroll = this.actualScroll
  })
  start = vi.fn()
  resize = vi.fn()
  destroy = vi.fn()

  readonly options: LenisOptions

  constructor(options: LenisOptions) {
    this.options = options
    FakeLenis.last = this
  }

  // Whether Lenis takes the wheel now (its `virtualScroll` gate).
  takesWheel() {
    return this.options.virtualScroll?.({} as never) !== false
  }
}

// The router, the frames and the overlay lock, fired by hand.
function env() {
  const before = new Set<() => void>()
  const resolved = new Set<() => void>()
  const frames: ((time: number) => void)[] = []
  let onLock: ((locked: boolean) => void) | undefined
  const subscribe = (set: Set<() => void>) => (callback: () => void) => {
    set.add(callback)
    return () => set.delete(callback)
  }
  const value: WeightedScrollEnv = {
    scroller: new EventTarget(),
    onBeforeNavigate: subscribe(before),
    onResolved: subscribe(resolved),
    nextFrame: (callback) => {
      frames.push(callback)
      return () => frames.splice(frames.indexOf(callback), 1)
    },
    observeLock: (onChange) => {
      onLock = onChange
      onChange(false)
      return () => {
        onLock = undefined
      }
    },
  }
  return {
    value,
    navigate: () => before.forEach((callback) => callback()),
    resolve: () => resolved.forEach((callback) => callback()),
    frame: (time = 0) => frames.splice(0).forEach((callback) => callback(time)),
    frames: () => frames.length,
    lock: (locked: boolean) => onLock?.(locked),
    scroll: () => value.scroller.dispatchEvent(new Event("scroll")),
    listeners: () => before.size + resolved.size + (onLock ? 1 : 0),
  }
}

function start() {
  const page = env()
  const stop = weightedScroll(FakeLenis, page.value)
  return { page, lenis: FakeLenis.last, stop }
}

describe("weightedScroll", () => {
  it("weighs the wheel only: touch and anchors stay the browser's", () => {
    const { lenis } = start()
    expect(lenis.options).toMatchObject({
      lerp: LERP,
      smoothWheel: true,
      syncTouch: false,
      anchors: false,
      autoRaf: false,
    })
    expect(LERP).toBe(0.065)
    expect(lenis.takesWheel()).toBe(true)
  })

  it("asks for frames from a wheel until the glide ends", () => {
    const { page, lenis } = start()
    expect(page.frames()).toBe(0)
    lenis.time = 5000
    lenis.wheel.forEach((callback) => callback())
    // The first frame doesn't step over the time since the last glide.
    expect(lenis.time).toBe(0)
    lenis.isScrolling = "smooth"
    lenis.wheel.forEach((callback) => callback())
    expect(page.frames()).toBe(1)
    page.frame(16)
    expect(lenis.raf).toHaveBeenLastCalledWith(16)
    expect(page.frames()).toBe(1)
    lenis.isScrolling = false
    page.frame(32)
    expect(lenis.raf).toHaveBeenCalledTimes(2)
    expect(page.frames()).toBe(0)
  })

  it("lets go of the glide on a page change, back a frame after it resolves", () => {
    const { page, lenis } = start()
    lenis.isScrolling = "smooth"
    page.navigate()
    expect(lenis.stop).toHaveBeenCalledOnce()
    expect(lenis.isScrolling).toBe(false)
    expect(lenis.takesWheel()).toBe(false)

    page.resolve()
    expect(lenis.takesWheel()).toBe(false)
    page.frame()
    expect(lenis.resize).toHaveBeenCalledOnce()
    expect(lenis.takesWheel()).toBe(true)
  })

  it("waits for the last of two quick page changes", () => {
    const { page, lenis } = start()
    page.navigate()
    page.resolve()
    page.navigate()
    page.frame()
    expect(lenis.takesWheel()).toBe(false)
    page.resolve()
    page.frame()
    expect(lenis.takesWheel()).toBe(true)
  })

  it("stands under an overlay and through a page change behind it", () => {
    const { page, lenis } = start()
    page.lock(true)
    expect(lenis.takesWheel()).toBe(false)
    page.navigate()
    page.resolve()
    page.frame()
    expect(lenis.takesWheel()).toBe(false)
    page.lock(false)
    expect(lenis.takesWheel()).toBe(true)
  })

  it("gives way to a scroll it didn't make in the middle of a glide", () => {
    const { page, lenis } = start()
    lenis.isScrolling = "smooth"
    lenis.animatedScroll = 400
    // Its own frame: the window is where Lenis put it.
    lenis.actualScroll = 400.5
    page.scroll()
    expect(lenis.stop).not.toHaveBeenCalled()

    // A key, find in page, `settleScroll`: somewhere else.
    lenis.actualScroll = 2100
    page.scroll()
    expect(lenis.stop).toHaveBeenCalledOnce()
    expect(lenis.start).toHaveBeenCalledOnce()
    expect(lenis.animatedScroll).toBe(2100)
  })

  it.each(["keydown", "pointerdown"])(
    "lets go of a glide on a %s, before the browser scrolls",
    (type) => {
      const { page, lenis } = start()
      page.value.scroller.dispatchEvent(new Event(type))
      expect(lenis.stop).not.toHaveBeenCalled()
      lenis.isScrolling = "smooth"
      page.value.scroller.dispatchEvent(new Event(type))
      expect(lenis.stop).toHaveBeenCalledOnce()
      expect(lenis.start).toHaveBeenCalledOnce()
    }
  )

  it("leaves a native scroll to Lenis's own sync", () => {
    const { page, lenis } = start()
    lenis.isScrolling = "native"
    lenis.actualScroll = 900
    page.scroll()
    expect(lenis.stop).not.toHaveBeenCalled()
  })

  it("cleans up after itself", () => {
    const { page, lenis, stop } = start()
    stop()
    expect(lenis.destroy).toHaveBeenCalledOnce()
    expect(page.listeners()).toBe(0)
    expect(lenis.wheel.size).toBe(0)
    lenis.isScrolling = "smooth"
    lenis.actualScroll = 2100
    page.scroll()
    expect(lenis.stop).not.toHaveBeenCalled()
  })
})
