import { useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

// The app renders only in the browser; a static render (the tests) reads
// the same query where there is a window, else says no.
function snapshot() {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches
}

// Whether the visitor asks for reduced motion (their system setting).
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
