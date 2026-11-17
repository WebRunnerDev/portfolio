import * as React from "react"
import { useRouter } from "@tanstack/react-router"

import { useMotionTier } from "@/shared/lib/motion-tier"

import { proto } from "./index"

// PROTOTYPE, branch spike/path-to-10 only. Weighted scroll (Lenis) for the
// `scroll` switch: only at the full tier (past the input gate, never at
// `lite`, `static` or reduced motion) and only with a fine pointer; touch
// keeps the browser's own scroll. Lenis scrolls the window itself
// (`scrollTo` every frame), so scroll timelines, the Swarm's per-frame
// reads and the router's scroll restoration see a native scroll.
const LERP = { light: 0.14, medium: 0.1, heavy: 0.065 } as const

export function SmoothScroll() {
  const { tier } = useMotionTier()
  const router = useRouter()
  const variant = proto("scroll")

  React.useEffect(() => {
    if (tier !== "full" || variant === "native") return
    if (!matchMedia("(pointer: fine)").matches) return
    let lenis: import("lenis").default | null = null
    let cancelled = false
    const unsubscribe: (() => void)[] = []

    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return
      const instance = new Lenis({
        lerp: LERP[variant],
        smoothWheel: true,
        syncTouch: false,
        // Anchor links (the skip link) keep the browser's jump and focus;
        // Lenis takes the new position from the scroll event it causes.
        anchors: false,
        autoRaf: true,
      })
      lenis = instance
      document.documentElement.dataset.protoLenis = variant

      // A new page: its height changed, and the router restores (or resets)
      // the scroll itself. Lenis drops any glide still running, so it
      // doesn't carry on from the last page, and takes the position the
      // router sets from the scroll event that follows.
      unsubscribe.push(
        router.subscribe("onBeforeNavigate", () => {
          instance.stop()
        }),
        router.subscribe("onResolved", () => {
          requestAnimationFrame(() => {
            instance.resize()
            instance.start()
          })
        })
      )

      // A Radix overlay locks the body (the menu, a dialog): Lenis stops
      // under it, so the wheel doesn't scroll the page behind.
      const locked = () => document.body.hasAttribute("data-scroll-locked")
      const lock = new MutationObserver(() => {
        if (locked()) instance.stop()
        else instance.start()
      })
      lock.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-scroll-locked"],
      })
      unsubscribe.push(() => lock.disconnect())
    })

    return () => {
      cancelled = true
      for (const off of unsubscribe) off()
      lenis?.destroy()
      delete document.documentElement.dataset.protoLenis
    }
  }, [tier, variant, router])

  return null
}
