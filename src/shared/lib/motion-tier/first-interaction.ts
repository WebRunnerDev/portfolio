// ADR-0012: the input gate. The visitor's first input on the page opens it
// for the rest of the visit; the full layer loads only after. `scroll` and
// `resize` don't count: scrollRestoration, anchors and Lighthouse's
// full-page screenshot cause them without a visitor. Nor does a
// `pointermove` that didn't move: Chrome sends one, trusted, after the first
// layout (and after a scroll) to update hover under a pointer standing
// still, headless too.
const EVENTS = [
  "pointermove",
  "pointerdown",
  "wheel",
  "touchstart",
  "keydown",
] as const

let opened = false
const waiting = new Set<() => void>()

function open(event: Event) {
  const { movementX, movementY } = event as PointerEvent
  if (event.type === "pointermove" && !movementX && !movementY) return
  opened = true
  for (const type of EVENTS) window.removeEventListener(type, open, true)
  for (const callback of waiting) callback()
  waiting.clear()
}

// Listening from the moment the app's code runs, so an input before the
// page renders still counts.
if (typeof window !== "undefined") {
  for (const type of EVENTS) {
    window.addEventListener(type, open, { capture: true, passive: true })
  }
}

// Whether the gate is open.
export const hadFirstInteraction = () => opened

// Calls `callback` once on the first input, at once if it already was.
// Returns the unsubscribe.
export function onFirstInteraction(callback: () => void) {
  if (opened) {
    callback()
    return () => {}
  }
  waiting.add(callback)
  return () => {
    waiting.delete(callback)
  }
}
