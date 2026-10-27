// ADR-0006: how much of the Hero effect a device gets.
// `full` the Kinetic Grid, `lite` the logo tiles in CSS, `static` an image.
export type HeroTier = "full" | "lite" | "static"

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
// A device at or below these runs `lite` without a probe.
const MAX_LITE_CORES = 4
const MAX_LITE_MEMORY_GB = 4
// The FPS probe: how long it counts frames, and the rate `full` needs.
export const PROBE_MS = 2000
export const MIN_FULL_FPS = 40
// A gap this long between two frames means the tab was hidden: the count
// starts over instead of reading it as a slow device.
const FRAME_GAP_MS = 500

// Not in every browser's Navigator type (Chromium only).
type DeviceHints = {
  hardwareConcurrency?: number
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

// The tier from what the browser tells at once. `full` here is only a
// candidate: the FPS probe still has to pass (useHeroTier).
export function detectTier(): HeroTier {
  if (window.matchMedia(REDUCED_MOTION).matches) return "static"
  const { hardwareConcurrency, deviceMemory, connection } =
    navigator as DeviceHints
  if (
    (hardwareConcurrency ?? Infinity) <= MAX_LITE_CORES ||
    (deviceMemory ?? Infinity) <= MAX_LITE_MEMORY_GB ||
    connection?.saveData
  ) {
    return "lite"
  }
  return "full"
}

// Frames per second over `duration` ms of requestAnimationFrame.
export function probeFps(duration = PROBE_MS, signal?: AbortSignal) {
  return new Promise<number>((resolve, reject) => {
    let start = -1
    let last = -1
    let frames = 0
    let id = 0
    const tick = (now: number) => {
      if (signal?.aborted) return
      if (start < 0 || now - last > FRAME_GAP_MS) {
        start = now
        frames = 0
      } else {
        frames++
      }
      last = now
      if (now - start >= duration) {
        resolve((frames * 1000) / (now - start))
        return
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    signal?.addEventListener("abort", () => {
      cancelAnimationFrame(id)
      reject(signal.reason)
    })
  })
}
