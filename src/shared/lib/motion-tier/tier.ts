// ADR-0006, ADR-0012: how much motion a device gets on the public pages,
// picked once a visit. `full` the full layer over `lite`, `lite` CSS and Web
// Animations, `static` the end state (reduced motion).
export type MotionTier = "full" | "lite" | "static"

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
// The FPS probe: how long it counts frames, and the rate `full` needs.
export const PROBE_MS = 2000
export const MIN_FULL_FPS = 40
// A gap this long between two frames means the tab was hidden: the count
// starts over instead of reading it as a slow device.
const FRAME_GAP_MS = 500

// The tier from what the browser tells at once. `full` here is only a
// candidate: the FPS probe still has to pass (MotionTierProvider). A weak
// device (few cores, little memory, Save-Data) is one too: the home page's
// scene runs a lighter level on it and steps down if it can't hold that
// (ADR-0013).
export function detectTier(): MotionTier {
  return window.matchMedia(REDUCED_MOTION).matches ? "static" : "full"
}

// Counts frames in windows of `duration` ms and reports each window's rate.
// Feed it the timestamps of requestAnimationFrame.
export function fpsMeter(duration: number, report: (fps: number) => void) {
  let start = -1
  let last = -1
  let frames = 0
  return (now: number) => {
    if (start < 0 || now - last > FRAME_GAP_MS) {
      start = now
      frames = 0
    } else {
      frames++
    }
    last = now
    if (now - start >= duration) {
      report((frames * 1000) / (now - start))
      start = now
      frames = 0
    }
  }
}

// Frames per second over `duration` ms of requestAnimationFrame.
export function probeFps(duration = PROBE_MS, signal?: AbortSignal) {
  return new Promise<number>((resolve, reject) => {
    let id = 0
    let done = false
    const count = fpsMeter(duration, (fps) => {
      done = true
      resolve(fps)
    })
    const tick = (now: number) => {
      if (signal?.aborted) return
      count(now)
      if (!done) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    signal?.addEventListener("abort", () => {
      cancelAnimationFrame(id)
      reject(signal.reason)
    })
  })
}
