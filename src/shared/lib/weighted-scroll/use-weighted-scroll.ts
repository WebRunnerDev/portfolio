import { useEffect } from "react"
import { useRouter } from "@tanstack/react-router"

import { usePrefersReducedMotion } from "@/shared/lib/motion"
import { useMotionTier } from "@/shared/lib/motion-tier"

import { weightedScroll, type WeightedScrollEnv } from "./weighted-scroll"

const FINE_POINTER = "(pointer: fine)"

// On `<html>` while Lenis runs (e2e reads it).
export const WEIGHTED_SCROLL_ATTRIBUTE = "data-weighted-scroll"

const LOCK_ATTRIBUTE = "data-scroll-locked"

type Router = ReturnType<typeof useRouter>

const windowEnv = (router: Router): WeightedScrollEnv => ({
  scroller: window,
  onBeforeNavigate: (callback) =>
    router.subscribe("onBeforeNavigate", callback),
  onResolved: (callback) => router.subscribe("onResolved", callback),
  nextFrame: (callback) => {
    const id = requestAnimationFrame(callback)
    return () => cancelAnimationFrame(id)
  },
  observeLock: (onChange) => {
    const locked = () => document.body.hasAttribute(LOCK_ATTRIBUTE)
    const observer = new MutationObserver(() => onChange(locked()))
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [LOCK_ATTRIBUTE],
    })
    onChange(locked())
    return () => observer.disconnect()
  },
})

// The weighted scroll (ADR-0014) on every page of the layout: only at the
// `full` Motion Tier (past the input gate) and with a mouse or a trackpad.
// A touch screen, `lite`, `static` and reduced motion keep the browser's
// scroll and never load Lenis: its chunk comes with `full`, outside the page
// load. A chunk that fails to load leaves the browser's scroll, quietly.
export function useWeightedScroll() {
  const { tier } = useMotionTier()
  const reduced = usePrefersReducedMotion()
  const router = useRouter()

  useEffect(() => {
    if (tier !== "full" || reduced) return undefined
    if (!window.matchMedia(FINE_POINTER).matches) return undefined
    let stop: (() => void) | undefined
    let cancelled = false
    import("lenis")
      .then(({ default: Lenis }) => {
        if (cancelled) return
        stop = weightedScroll(Lenis, windowEnv(router))
        document.documentElement.setAttribute(WEIGHTED_SCROLL_ATTRIBUTE, "")
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      stop?.()
      document.documentElement.removeAttribute(WEIGHTED_SCROLL_ATTRIBUTE)
    }
  }, [tier, reduced, router])
}
