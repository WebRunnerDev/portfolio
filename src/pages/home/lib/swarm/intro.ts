import { DURATION, EASE } from "@/shared/lib/motion"

import { bezier, clamp } from "./math"

// docs/design-brief.md › Главная на Swarm › Загрузка слоя: once the scene
// draws, the canvas fades in over `lite` (`duration-slow`) with the dust
// scattered over the screen. A crawl lights the hero's web breadth first
// while the readout counts its nodes; then the dust gathers into the logo
// on `easing-layout` and the web draws in toward it.
export const FADE_MS = DURATION.slow * 1000
export const CRAWL_AT = 250
export const INDEXED_AT = 2450
export const GATHER_AT = 2500
export const GATHER_MS = 1300
export const INTRO_MS = GATHER_AT + GATHER_MS
// The web around the logo before it draws in, times its size.
export const WEB_SPREAD = 1.28

const layout = bezier(EASE.layout)
const enter = bezier(EASE.enter)

export type IntroState = {
  // The crawl is lighting the web.
  crawling: boolean
  // The crawl is done: every node indexed.
  indexed: boolean
  // How far the blocks are from the spread to the logo, eased, 0–1.
  gather: number
  // How far the web is drawn in: WEB_SPREAD to 1.
  spread: number
  // How much the text pushes the web out of its boxes, 0–1: the text is
  // up before the scene, so from the start, over the fade.
  mask: number
  done: boolean
}

// The intro `elapsed` ms after the scene's first frame.
export function intro(elapsed: number): IntroState {
  const gather = layout(clamp((elapsed - GATHER_AT) / GATHER_MS))
  return {
    crawling: elapsed >= CRAWL_AT && elapsed < INDEXED_AT,
    indexed: elapsed >= INDEXED_AT,
    gather,
    spread: WEB_SPREAD + (1 - WEB_SPREAD) * gather,
    mask: enter(clamp(elapsed / FADE_MS)),
    done: elapsed >= INTRO_MS,
  }
}

// The hero's crawl readout: the nodes lit so far, then all of them.
export const readout = (state: IntroState, lit: number, nodes: number) =>
  state.indexed ? `Indexed · ${nodes} nodes` : `Crawling · ${lit} nodes`
