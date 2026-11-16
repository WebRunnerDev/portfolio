// ADR-0013 › Уровни качества: one scene, four sets of numbers. Until
// issue #187 the scene runs `desktop` everywhere and drops to `lite` below
// the probe's frame rate (ADR-0012).
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

export const DESKTOP: Quality = {
  perBlock: 9000,
  perFar: 46,
  nodes: 1,
  segments: 14,
  dpr: 1.5,
  glow: 0.5,
  post: true,
  fps: 60,
}

// A block's dust is as dense at every level: fewer particles draw larger,
// by the spike's rule (`uSizeK`). Never smaller than at `desktop`.
export const sizeK = (perBlock: number) =>
  (DESKTOP.perBlock / Math.min(perBlock, DESKTOP.perBlock)) ** 0.3
