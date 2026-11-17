import { fpsMeter, MIN_FULL_FPS, PROBE_MS } from "@/shared/lib/motion-tier"

// ADR-0013 › Уровни качества: one scene, four sets of numbers. The rest of
// the site sees one `full`; only the scene knows its level.
export type Quality = {
  // Particles in each of the logo's blocks.
  perBlock: number
  // Particles in each far node.
  perFar: number
  // The share of the web's far nodes laid (1: the spike's count).
  nodes: number
  // Segments per thread.
  segments: number
  // The canvas's device pixel ratio at most.
  dpr: number
  // The dark theme's glow, 0 for none.
  glow: number
  // The scene goes through the finish (vignette, grain, glow) in a buffer
  // of its own; without, it draws straight to the canvas.
  post: boolean
  // Frames a second at most.
  fps: number
}

export const LEVELS = {
  desktop: {
    perBlock: 9000,
    perFar: 46,
    nodes: 1,
    segments: 14,
    dpr: 1.5,
    glow: 0.5,
    post: true,
    fps: 60,
  },
  "desktop-lite": {
    perBlock: 4000,
    perFar: 30,
    nodes: 0.6,
    segments: 10,
    dpr: 1,
    glow: 0,
    post: true,
    fps: 60,
  },
  mobile: {
    perBlock: 4000,
    perFar: 30,
    nodes: 0.55,
    segments: 10,
    dpr: 1.5,
    glow: 0.35,
    post: true,
    fps: 60,
  },
  "mobile-lite": {
    perBlock: 1800,
    perFar: 20,
    nodes: 0.35,
    segments: 8,
    dpr: 1,
    glow: 0,
    post: false,
    fps: 30,
  },
} as const satisfies Record<string, Quality>

export type Level = keyof typeof LEVELS

export const DESKTOP: Quality = LEVELS.desktop

// The step down from each level; the lite levels have none.
export const LOWER: Partial<Record<Level, Level>> = {
  desktop: "desktop-lite",
  mobile: "mobile-lite",
}

// A phone: a coarse pointer or a viewport narrower than this (CSS pixels).
const PHONE_WIDTH = 860
// A weak device: at or below these, or saving data.
const WEAK_CORES = 4
const WEAK_MEMORY_GB = 4

export type Device = {
  coarse: boolean
  width: number
  cores?: number
  memory?: number
  saveData?: boolean
}

// The level a device starts at: its class (a phone or not), lite when it is
// weak. What the browser doesn't tell doesn't hold it back.
export function pickLevel({
  coarse,
  width,
  cores,
  memory,
  saveData,
}: Device): Level {
  const phone = coarse || width < PHONE_WIDTH
  const weak =
    (cores ?? Infinity) <= WEAK_CORES ||
    (memory ?? Infinity) <= WEAK_MEMORY_GB ||
    !!saveData
  if (phone) return weak ? "mobile-lite" : "mobile"
  return weak ? "desktop-lite" : "desktop"
}

// Not in every browser's Navigator type (Chromium only).
type DeviceHints = {
  hardwareConcurrency?: number
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

// This device, as the browser tells it now.
export function thisDevice(): Device {
  const { hardwareConcurrency, deviceMemory, connection } =
    navigator as DeviceHints
  return {
    coarse: window.matchMedia("(pointer: coarse)").matches,
    width: window.innerWidth,
    cores: hardwareConcurrency,
    memory: deviceMemory,
    saveData: connection?.saveData,
  }
}

// A scene built at `built` that steps down to `to` mid-visit: the lower
// level's particles (fewer drawn, never more than were laid), glow, DPR and
// frame cap. Its nodes, threads, far dust and finish stay as built, until
// the scene starts again.
export const lowered = (built: Quality, to: Level): Quality => ({
  ...built,
  perBlock: Math.min(LEVELS[to].perBlock, built.perBlock),
  glow: LEVELS[to].glow,
  dpr: LEVELS[to].dpr,
  fps: LEVELS[to].fps,
})

// The frame rate a scene capped at `cap` needs to hold.
export const minFps = (cap: number) => (cap < 60 ? 24 : MIN_FULL_FPS)

// After a step down the frame rate settles this long (ms) before it is
// measured again.
export const SETTLE_MS = 3000

// Watches the frame rate of a scene at `level` (ADR-0013 › Понижение на
// ходу): in windows of PROBE_MS, below `minFps` of the level's cap it steps
// down a level (`onLower`), then waits SETTLE_MS before measuring again;
// below a lite level it gives up (`onFail`) and measures no more. Feed it
// the timestamps of the frames drawn.
export function stepDown(
  level: Level,
  { onLower, onFail }: { onLower: (level: Level) => void; onFail: () => void }
) {
  let current = level
  let at = 0
  // Until then nothing is measured; a step down starts a new window after.
  let settled = -Infinity
  let done = false
  const measure = () =>
    fpsMeter(PROBE_MS, (fps) => {
      if (fps >= minFps(LEVELS[current].fps)) return
      const next = LOWER[current]
      if (!next) {
        done = true
        onFail()
        return
      }
      current = next
      settled = at + SETTLE_MS
      count = null
      onLower(next)
    })
  let count: ((now: number) => void) | null = measure()
  return (now: number) => {
    if (done || now < settled) return
    at = now
    count ??= measure()
    count(now)
  }
}

// The query parameter that pins the level for e2e and acceptance
// (`?swarm=desktop-lite`): the scene stays at it and doesn't step down.
// Only the full chunk reads it, so no visitor gets it by chance.
const PIN = "swarm"

export function pinnedLevel(search: string): Level | null {
  const value = new URLSearchParams(search).get(PIN)
  return value && Object.hasOwn(LEVELS, value) ? (value as Level) : null
}

// A block's dust is as dense at every level: fewer particles draw larger,
// by the spike's rule (`uSizeK`). Never smaller than at `desktop`.
export const sizeK = (perBlock: number) =>
  (DESKTOP.perBlock / Math.min(perBlock, DESKTOP.perBlock)) ** 0.3
