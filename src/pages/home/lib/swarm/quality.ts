// ADR-0013 › Уровни качества: one scene, four sets of numbers. Until
// issue #187 the scene runs `desktop` everywhere and drops to `lite` below
// the probe's frame rate (ADR-0012).
export type Quality = {
  // Particles in each of the logo's blocks.
  perBlock: number
  // The canvas's device pixel ratio at most.
  dpr: number
  // The scene goes through the finish (vignette, grain) in a buffer of its
  // own; without, it draws straight to the canvas.
  post: boolean
  // Frames a second at most.
  fps: number
}

export const DESKTOP: Quality = {
  perBlock: 9000,
  dpr: 1.5,
  post: true,
  fps: 60,
}
