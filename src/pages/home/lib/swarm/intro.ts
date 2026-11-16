import { DURATION, EASE } from "@/shared/lib/motion"

import { bezier } from "./math"

// docs/design-brief.md › Главная на Swarm › Загрузка слоя: once the scene
// draws, the canvas fades in over `lite` (`duration-slow`) with the dust
// scattered over the screen; then the dust gathers into the logo on
// `easing-layout`, and only then `lite` leaves.
export const GATHER_DELAY_MS = DURATION.slow * 1000
export const GATHER_MS = 1300
export const INTRO_MS = GATHER_DELAY_MS + GATHER_MS

const layout = bezier(EASE.layout)

export type IntroState = {
  // How far the blocks are from the spread to the logo, eased, 0–1.
  gather: number
  // How formed the dust is, 0 (scattered over the screen) to 1 (on the
  // blocks); each particle has its own start (the dust shader).
  form: number
  // The crawl's readout: which of the paths it is at, or -1 once done.
  path: number
  done: boolean
}

// The intro `elapsed` ms after the scene's first frame, with `paths` pages
// to show in the readout while the dust gathers.
export function intro(elapsed: number, paths: number): IntroState {
  const t = Math.min(1, Math.max(0, (elapsed - GATHER_DELAY_MS) / GATHER_MS))
  const gather = layout(t)
  const done = elapsed >= INTRO_MS
  return {
    gather,
    form: gather,
    path: done ? -1 : Math.min(paths - 1, Math.floor(t * paths)),
    done,
  }
}
