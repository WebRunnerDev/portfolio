import { afterEach, describe, expect, it, vi } from "vitest"

import {
  DESKTOP,
  LEVELS,
  lowered,
  minFps,
  pickLevel,
  pinnedLevel,
  SETTLE_MS,
  sizeK,
  stepDown,
  thisDevice,
  type Level,
} from "./quality"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("pickLevel", () => {
  const strong = { cores: 8, memory: 8, saveData: false }

  it("gives a computer desktop, a phone mobile", () => {
    expect(pickLevel({ coarse: false, width: 1440, ...strong })).toBe("desktop")
    expect(pickLevel({ coarse: true, width: 1440, ...strong })).toBe("mobile")
  })

  it("takes a viewport under 860 px for a phone", () => {
    expect(pickLevel({ coarse: false, width: 859, ...strong })).toBe("mobile")
    expect(pickLevel({ coarse: false, width: 860, ...strong })).toBe("desktop")
  })

  it("gives a weak device the lite level of its class", () => {
    const weak = [
      { ...strong, cores: 4 },
      { ...strong, memory: 4 },
      { ...strong, saveData: true },
    ]
    for (const hints of weak) {
      expect(pickLevel({ coarse: false, width: 1440, ...hints })).toBe(
        "desktop-lite"
      )
      expect(pickLevel({ coarse: true, width: 390, ...hints })).toBe(
        "mobile-lite"
      )
    }
  })

  it("doesn't hold back what the browser doesn't tell", () => {
    // Firefox and Safari have no deviceMemory nor connection.
    expect(pickLevel({ coarse: false, width: 1440, cores: 8 })).toBe("desktop")
    expect(pickLevel({ coarse: false, width: 1440 })).toBe("desktop")
  })
})

describe("thisDevice", () => {
  it("reads the pointer, the viewport and the hints", () => {
    vi.stubGlobal("window", {
      innerWidth: 390,
      matchMedia: (query: string) => ({
        matches: query === "(pointer: coarse)",
      }),
    })
    vi.stubGlobal("navigator", {
      hardwareConcurrency: 6,
      deviceMemory: 4,
      connection: { saveData: false },
    })
    expect(thisDevice()).toEqual({
      coarse: true,
      width: 390,
      cores: 6,
      memory: 4,
      saveData: false,
    })
  })
})

describe("the levels", () => {
  it("are ADR-0013's table", () => {
    expect(
      Object.entries(LEVELS).map(([level, q]) => [
        level,
        q.perBlock,
        q.nodes,
        q.segments,
        q.dpr,
        q.glow,
        q.post,
        q.fps,
      ])
    ).toEqual([
      ["desktop", 9000, 1, 14, 1.5, 0.5, true, 60],
      ["desktop-lite", 4000, 0.6, 10, 1, 0, true, 60],
      ["mobile", 4000, 0.55, 10, 1.5, 0.35, true, 60],
      ["mobile-lite", 1800, 0.35, 8, 1, 0, false, 30],
    ])
  })
})

describe("lowered", () => {
  it("takes the lower level's particles, glow, DPR and frame cap", () => {
    expect(lowered(LEVELS.mobile, "mobile-lite")).toEqual({
      ...LEVELS.mobile,
      perBlock: 1800,
      glow: 0,
      dpr: 1,
      fps: 30,
    })
  })

  it("keeps the web, the far dust and the finish as built", () => {
    const q = lowered(LEVELS.desktop, "desktop-lite")
    expect(q.nodes).toBe(1)
    expect(q.segments).toBe(14)
    expect(q.perFar).toBe(46)
    expect(q.post).toBe(true)
    // `mobile` has a finish, `mobile-lite` none: it stays.
    expect(lowered(LEVELS.mobile, "mobile-lite").post).toBe(true)
  })

  it("never draws more particles than were laid", () => {
    expect(lowered(LEVELS["mobile-lite"], "desktop").perBlock).toBe(1800)
  })
})

describe("minFps", () => {
  it("is the probe's 40 at 60 frames, 24 under a cap of 30", () => {
    expect(minFps(60)).toBe(40)
    expect(minFps(30)).toBe(24)
  })
})

describe("stepDown", () => {
  // Feeds `watch` frames `every` ms apart from `from` to `to`.
  function run(
    watch: (now: number) => void,
    every: number,
    from: number,
    to: number
  ) {
    for (let now = from; now <= to; now += every) watch(now)
    return to + every
  }

  function watched(level: Level) {
    const steps: Level[] = []
    const onFail = vi.fn()
    const watch = stepDown(level, {
      onLower: (next) => steps.push(next),
      onFail,
    })
    return { watch, steps, onFail }
  }

  it("holds while the frame rate does", () => {
    const { watch, steps, onFail } = watched("desktop")
    run(watch, 16, 0, 20_000)
    expect(steps).toEqual([])
    expect(onFail).not.toHaveBeenCalled()
  })

  it("steps desktop down to desktop-lite, then falls back", () => {
    const { watch, steps, onFail } = watched("desktop")
    // 20 fps: the first window steps down.
    let now = run(watch, 50, 0, 2000)
    expect(steps).toEqual(["desktop-lite"])
    expect(onFail).not.toHaveBeenCalled()
    // Nothing is measured while it settles.
    now = run(watch, 50, now, 2000 + SETTLE_MS - 50)
    expect(onFail).not.toHaveBeenCalled()
    // Then a window at desktop-lite, still slow: lite.
    run(watch, 50, now, now + 2100)
    expect(onFail).toHaveBeenCalledTimes(1)
    expect(steps).toEqual(["desktop-lite"])
  })

  it("steps mobile down to mobile-lite", () => {
    const { watch, steps } = watched("mobile")
    run(watch, 30, 0, 2100)
    expect(steps).toEqual(["mobile-lite"])
  })

  it("holds a slow settle without counting it as slow", () => {
    const { watch, steps, onFail } = watched("desktop")
    let now = run(watch, 50, 0, 2000)
    // The frames that come during the settle are slow; after it, fast.
    now = run(watch, 100, now, 2000 + SETTLE_MS - 100)
    run(watch, 16, now, now + 6000)
    expect(steps).toEqual(["desktop-lite"])
    expect(onFail).not.toHaveBeenCalled()
  })

  it("holds 30 frames a second at the level capped at 30", () => {
    const { watch, onFail } = watched("mobile-lite")
    run(watch, 33.4, 0, 10_000)
    expect(onFail).not.toHaveBeenCalled()
  })

  it("falls back below 24 at the level capped at 30", () => {
    const { watch, onFail } = watched("mobile-lite")
    run(watch, 50, 0, 2100)
    expect(onFail).toHaveBeenCalledTimes(1)
    // And measures no more.
    run(watch, 50, 2150, 10_000)
    expect(onFail).toHaveBeenCalledTimes(1)
  })

  it("falls back at once from a lite level at 60 frames", () => {
    const { watch, steps, onFail } = watched("desktop-lite")
    run(watch, 30, 0, 2100)
    expect(steps).toEqual([])
    expect(onFail).toHaveBeenCalledTimes(1)
  })
})

describe("pinnedLevel", () => {
  it("reads the level from ?swarm=", () => {
    expect(pinnedLevel("?swarm=desktop-lite")).toBe("desktop-lite")
    expect(pinnedLevel("?a=1&swarm=mobile")).toBe("mobile")
  })

  it("pins nothing without it, or with a level that isn't one", () => {
    expect(pinnedLevel("")).toBeNull()
    expect(pinnedLevel("?swarm=")).toBeNull()
    expect(pinnedLevel("?swarm=ultra")).toBeNull()
    expect(pinnedLevel("?swarm=toString")).toBeNull()
  })
})

describe("sizeK", () => {
  it("draws the dust at its own size at desktop's count", () => {
    expect(sizeK(DESKTOP.perBlock)).toBe(1)
  })

  it("draws fewer particles larger, so a block doesn't thin out", () => {
    expect(sizeK(4500)).toBeCloseTo(2 ** 0.3, 5)
    expect(sizeK(2000)).toBeGreaterThan(sizeK(4500))
  })

  it("never draws them smaller than at desktop", () => {
    expect(sizeK(20000)).toBe(1)
  })
})
