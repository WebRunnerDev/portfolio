import { useEffect } from "react"

import { usePrefersReducedMotion } from "@/shared/lib/motion"
import { onFirstInteraction } from "@/shared/lib/motion-tier"

import { followPointer } from "../lib/follow-pointer"

const FINE_POINTER = "(pointer: fine)"

// The tile beside the cursor (lib/follow-pointer), on every public page: for
// a mouse or a pen, never with reduced motion. It starts with the visitor's
// first input (the gate of ADR-0012), so a page load listens to nothing more.
export function CursorTile() {
  const reduced = usePrefersReducedMotion()
  useEffect(() => {
    if (reduced || !window.matchMedia(FINE_POINTER).matches) return
    let stop: (() => void) | undefined
    const unsubscribe = onFirstInteraction(() => {
      stop = followPointer()
    })
    return () => {
      unsubscribe()
      stop?.()
    }
  }, [reduced])
  return null
}
