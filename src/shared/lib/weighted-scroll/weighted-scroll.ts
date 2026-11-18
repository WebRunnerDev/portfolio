import type { LenisOptions } from "lenis"

// ADR-0014: the weighted scroll. Lenis glides the window toward where the
// wheel or the trackpad sends it, `LERP` of the way each frame (at 60 fps).
// It scrolls the window itself, so scroll timelines, the Swarm's reads, the
// router's scroll restoration and find in page see a native scroll.
export const LERP = 0.065

// Further off than this from where Lenis last put the window, a scroll is
// someone else's (rounding stays under a pixel).
const FOREIGN_SCROLL_PX = 2

// The reader's hand on something other than the wheel.
const INPUT = ["keydown", "pointerdown"] as const

// What of a Lenis instance this module drives (`lenis` in the browser, a
// fake in the tests).
export type WeightedLenis = {
  readonly isScrolling: boolean | "native" | "smooth"
  readonly actualScroll: number
  animatedScroll: number
  // The last frame's time; 0 makes the next frame's step 0.
  time: number
  raf: (time: number) => void
  on: (event: "virtual-scroll", callback: () => void) => () => void
  stop: () => void
  start: () => void
  resize: () => void
  destroy: () => void
}

export type WeightedScrollEnv = {
  // Where the window's `scroll` events arrive.
  scroller: EventTarget
  // The router: a page change starts, the new page is on screen. Each
  // returns its unsubscribe.
  onBeforeNavigate: (callback: () => void) => () => void
  onResolved: (callback: () => void) => () => void
  // requestAnimationFrame; returns the cancel.
  nextFrame: (callback: (time: number) => void) => () => void
  // A Radix overlay locks the page (`data-scroll-locked` on `<body>`): calls
  // `onChange` with the lock now and on each change; returns the unsubscribe.
  observeLock: (onChange: (locked: boolean) => void) => () => void
}

type Pause = "navigation" | "overlay"

export function weightedScrollOptions(isPaused: () => boolean): LenisOptions {
  return {
    lerp: LERP,
    smoothWheel: true,
    // A touch scrolls natively, with the device's own inertia.
    syncTouch: false,
    // Anchor links (the skip link, "Back to top") keep the browser's jump
    // and its focus.
    anchors: false,
    // Frames only while it glides (`weightedScroll`): Lenis's own loop
    // would ask for a frame on every vsync for the whole visit, and keep a
    // still page rendering.
    autoRaf: false,
    // A wheel over a box that scrolls on its own (the player's track list, a
    // dropdown) scrolls that box, natively.
    allowNestedScroll: true,
    // Paused, Lenis lets the wheel through untouched: the browser scrolls,
    // or Radix holds the page under an overlay while its own box scrolls.
    // (Lenis's `stop()` would cancel every wheel instead.)
    virtualScroll: () => !isPaused(),
  }
}

// Runs Lenis on the window; returns the teardown.
export function weightedScroll(
  Lenis: new (options: LenisOptions) => WeightedLenis,
  env: WeightedScrollEnv
): () => void {
  const paused = new Set<Pause>()
  const lenis = new Lenis(weightedScrollOptions(() => paused.size > 0))

  // The frame loop runs from a wheel Lenis takes until its glide ends.
  let cancelGlide: (() => void) | undefined
  const glide = (time: number) => {
    lenis.raf(time)
    cancelGlide =
      lenis.isScrolling === "smooth" ? env.nextFrame(glide) : undefined
  }
  const offWheel = lenis.on("virtual-scroll", () => {
    if (cancelGlide) return
    // The first frame steps from itself, not from the last glide.
    lenis.time = 0
    cancelGlide = env.nextFrame(glide)
  })

  // Drops the glide where the window is now: Lenis no longer pulls it
  // toward its old target.
  const settle = () => {
    lenis.stop()
    lenis.start()
  }
  const pause = (reason: Pause) => {
    paused.add(reason)
    settle()
  }
  const resume = (reason: Pause) => {
    if (!paused.delete(reason) || paused.size > 0) return
    // The page may have changed size and place while Lenis waited.
    lenis.resize()
  }

  // A scroll Lenis didn't make in the middle of its glide: the scrollbar,
  // find in page, an anchor, `settleScroll` or the router putting the window
  // back. That one wins; Lenis lets go of its target.
  const onScroll = () => {
    if (
      lenis.isScrolling === "smooth" &&
      Math.abs(lenis.actualScroll - lenis.animatedScroll) > FOREIGN_SCROLL_PX
    ) {
      settle()
    }
  }
  // A key or a press in the middle of a glide: the browser's own scroll
  // (arrows, Page Down, Space, Home, End, a link to an anchor) runs as an
  // animation of its own, which Lenis's next frame would cut off. Lenis lets
  // go first.
  const onInput = () => {
    if (lenis.isScrolling === "smooth") settle()
  }
  env.scroller.addEventListener("scroll", onScroll, { passive: true })
  for (const type of INPUT) {
    env.scroller.addEventListener(type, onInput, { passive: true })
  }

  // A page change: the router sets the new page's scroll (the top, or the
  // saved one on Back and Forward, which `useSettleScroll` holds as the page
  // grows). Lenis waits until the new page is on screen, a frame more for
  // the router's restore, and takes the position from there.
  let cancelResume: (() => void) | undefined
  const offBefore = env.onBeforeNavigate(() => {
    cancelResume?.()
    cancelResume = undefined
    pause("navigation")
  })
  const offResolved = env.onResolved(() => {
    cancelResume?.()
    cancelResume = env.nextFrame(() => {
      cancelResume = undefined
      resume("navigation")
    })
  })

  // Under an overlay the wheel belongs to it.
  const offLock = env.observeLock((locked) => {
    if (locked) pause("overlay")
    else resume("overlay")
  })

  return () => {
    env.scroller.removeEventListener("scroll", onScroll)
    for (const type of INPUT) env.scroller.removeEventListener(type, onInput)
    offWheel()
    offBefore()
    offResolved()
    offLock()
    cancelResume?.()
    cancelGlide?.()
    lenis.destroy()
  }
}
