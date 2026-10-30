import { useSyncExternalStore } from "react"

// Tailwind's `lg`, where the menu's classes turn it into the panel.
const QUERY = "(min-width: 64rem)"

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const snapshot = () =>
  typeof window !== "undefined" && window.matchMedia(QUERY).matches

// Whether the menu is the panel under the header (from `lg`) rather than the
// full screen: the panel leaves the page in view, so it doesn't lock it.
export function useMenuPanel() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
