import * as React from "react"
import { useReducedMotionConfig } from "motion/react"

import { DURATION } from "@/shared/lib/motion"

// The bottom tenth of the viewport doesn't count: an element starts once it
// is clearly on screen, not while its first pixel scrolls in.
const ROOT_MARGIN = "0px 0px -10% 0px"

// Starts a reveal once, when the element enters the viewport. `animated` is
// false under reduced motion and without IntersectionObserver: render the
// end state. The content never stays hidden: if the animation hasn't started
// by the end of the choreography (Motion's features failed to load, a
// background tab), `animated` turns false and the content shows as is.
export function useReveal<T extends Element>() {
  const ref = React.useRef<T>(null)
  const reduced = useReducedMotionConfig() ?? false
  const [inView, setInView] = React.useState(false)
  const [stalled, setStalled] = React.useState(false)
  const started = React.useRef(false)
  const animated =
    typeof IntersectionObserver !== "undefined" && !reduced && !stalled

  React.useEffect(() => {
    const element = ref.current
    if (!animated || !element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setInView(true)
        observer.disconnect()
      },
      { rootMargin: ROOT_MARGIN }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [animated])

  React.useEffect(() => {
    if (!inView) return
    const timer = window.setTimeout(() => {
      if (!started.current) setStalled(true)
    }, DURATION.choreographyMax * 1000)
    return () => window.clearTimeout(timer)
  }, [inView])

  const onAnimationStart = React.useCallback(() => {
    started.current = true
  }, [])

  return { ref, animated, inView, onAnimationStart }
}
