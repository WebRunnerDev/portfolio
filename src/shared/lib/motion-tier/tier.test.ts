import { afterEach, describe, expect, it, vi } from "vitest"

import { detectTier, fpsMeter, probeFps } from "./tier"

function device({
  reduced = false,
  cores,
  memory,
  saveData,
}: {
  reduced?: boolean
  cores?: number
  memory?: number
  saveData?: boolean
}) {
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({
      matches: reduced && query === "(prefers-reduced-motion: reduce)",
    }),
  })
  vi.stubGlobal("navigator", {
    hardwareConcurrency: cores,
    deviceMemory: memory,
    connection: saveData === undefined ? undefined : { saveData },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("detectTier", () => {
  it("is static under reduced motion, on any device", () => {
    device({ reduced: true, cores: 16, memory: 8 })
    expect(detectTier()).toBe("static")
    device({ reduced: true, cores: 2, saveData: true })
    expect(detectTier()).toBe("static")
  })

  it("is lite with 4 cores or fewer", () => {
    device({ cores: 4, memory: 8 })
    expect(detectTier()).toBe("lite")
  })

  it("is lite with 4 GB of memory or less", () => {
    device({ cores: 8, memory: 4 })
    expect(detectTier()).toBe("lite")
  })

  it("is lite when the user saves data", () => {
    device({ cores: 8, memory: 8, saveData: true })
    expect(detectTier()).toBe("lite")
  })

  it("is a full candidate otherwise", () => {
    device({ cores: 8, memory: 8, saveData: false })
    expect(detectTier()).toBe("full")
  })

  it("doesn't hold back what the browser doesn't tell", () => {
    // Firefox and Safari have no deviceMemory nor connection.
    device({ cores: 8 })
    expect(detectTier()).toBe("full")
    device({})
    expect(detectTier()).toBe("full")
  })
})

describe("probeFps", () => {
  // Frames `every` ms apart, from a fake requestAnimationFrame.
  function frames(every: number[]) {
    let now = 0
    let i = 0
    vi.stubGlobal("requestAnimationFrame", (tick: (now: number) => void) => {
      now += every[Math.min(i++, every.length - 1)]
      queueMicrotask(() => tick(now))
      return i
    })
    vi.stubGlobal("cancelAnimationFrame", () => {})
  }

  it("counts the frames over the probe", async () => {
    frames([16])
    expect(await probeFps(2000)).toBeCloseTo(62.5, 0)
    frames([40])
    expect(await probeFps(2000)).toBeCloseTo(25, 0)
  })

  it("starts over after the tab was hidden", async () => {
    // Ten fast frames, a hidden tab for 5 s, then 30 fps.
    frames([...Array(10).fill(16), 5000, 33])
    expect(await probeFps(2000)).toBeCloseTo(30, 0)
  })

  it("stops when aborted", async () => {
    frames([16])
    const controller = new AbortController()
    const probe = probeFps(2000, controller.signal)
    controller.abort()
    await expect(probe).rejects.toThrow()
  })
})

describe("fpsMeter", () => {
  // Feeds the meter frames `every` ms apart for `duration` ms.
  function run(count: (now: number) => void, every: number, duration: number) {
    for (let now = 0; now <= duration; now += every) count(now)
  }

  it("reports every window while it runs", () => {
    const report = vi.fn()
    run(fpsMeter(2000, report), 16, 6000)
    expect(report).toHaveBeenCalledTimes(3)
    expect(report.mock.calls[0][0]).toBeCloseTo(62.5, 0)
  })

  it("reports a drop in the frame rate", () => {
    const report = vi.fn()
    const count = fpsMeter(2000, report)
    run(count, 16, 2000)
    for (let now = 2050; now <= 4000; now += 50) count(now)
    expect(report.mock.lastCall?.[0]).toBeCloseTo(20, 0)
  })

  it("starts over after a pause instead of reading it as slow", () => {
    const report = vi.fn()
    const count = fpsMeter(2000, report)
    run(count, 16, 1000)
    for (let now = 9000; now <= 11_100; now += 16) count(now)
    expect(report).toHaveBeenCalledTimes(1)
    expect(report.mock.calls[0][0]).toBeCloseTo(62.5, 0)
  })
})
