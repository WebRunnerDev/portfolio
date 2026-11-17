// Back to a page whose content arrives after it renders (the home page's
// sections each wait for their own data) must still land where the reader
// left it. The router restores the scroll once, as the page renders; a page
// shorter than that position then clamps it, and the reader lands near the
// top. `settleScroll` keeps putting the scroll back on the saved position as
// the page grows, until the reader moves it, or SETTLE_MS have passed.

export const SETTLE_MS = 10_000

// The reader's own hand on the scroll: a wheel, a touch, a key, the
// scrollbar. `scroll` isn't one: putting the scroll back fires it too.
export const READER_INPUT = [
  "wheel",
  "touchstart",
  "keydown",
  "pointerdown",
] as const

export type ScrollPosition = { top: number; left: number }

export type SettleEnv = {
  // Where the reader's input arrives (the window).
  input: EventTarget
  scrollTo: (position: ScrollPosition) => void
  // Calls `onGrow` each time the page changes size; returns the unsubscribe.
  observeSize: (onGrow: () => void) => () => void
}

// Returns the stop, for the next page change.
export function settleScroll(
  position: ScrollPosition,
  env: SettleEnv
): () => void {
  let stopped = false
  const restore = () => env.scrollTo(position)
  const unobserve = env.observeSize(restore)
  const timer = setTimeout(() => stop(), SETTLE_MS)

  function stop() {
    if (stopped) return
    stopped = true
    unobserve()
    clearTimeout(timer)
    for (const type of READER_INPUT) env.input.removeEventListener(type, stop)
  }

  for (const type of READER_INPUT) {
    env.input.addEventListener(type, stop, { passive: true })
  }
  restore()
  return stop
}
