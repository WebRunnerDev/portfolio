import * as React from "react"
import { LazyMotion, MotionConfig } from "motion/react"

import { DURATION, EASE, loadMotionFeatures } from "@/shared/lib/motion"

// ADR-0005: `m` components only (`strict` throws on `motion.*`), the
// animation features load in their own chunk. A transition without its own
// curve takes the entrance one; reduced motion skips transforms, and the
// shared Reveal primitives skip the animation entirely.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig
        reducedMotion="user"
        transition={{ ease: EASE.enter, duration: DURATION.reveal }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
