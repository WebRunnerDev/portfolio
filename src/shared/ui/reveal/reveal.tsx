import * as React from "react"
import { m } from "motion/react"

import { useDirection } from "@/shared/lib/direction"
import { DURATION, EASE, STAGGER } from "@/shared/lib/motion"

import { useReveal } from "./use-reveal"

type RevealTag = "div" | "section" | "article" | "header" | "ul" | "li" | "p"

export type RevealProps = {
  children: React.ReactNode
  as?: RevealTag
  className?: string
  // Seconds before the start, on top of `order`.
  delay?: number
  // The place in a group revealed together: `order × stagger-item` later.
  order?: number
  // Px it travels in the reading direction (mirrored in RTL) and upward.
  x?: number
  y?: number
}

// DESIGN.md › Motion: a block fades in and settles when it enters the
// viewport, once. Under reduced motion it is there from the start.
export function Reveal({
  children,
  as = "div",
  className,
  delay = 0,
  order = 0,
  x = 0,
  y = x === 0 ? 24 : 0,
}: RevealProps) {
  const { flipX } = useDirection()
  const { ref, animated, inView, onAnimationStart } = useReveal<HTMLElement>()

  if (!animated) {
    const Tag = as
    return (
      <Tag ref={ref as React.Ref<never>} className={className}>
        {children}
      </Tag>
    )
  }

  // One `m` component per tag; the union of them is too wide for JSX.
  const Tag = m[as] as typeof m.div
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={className}
      initial={{ opacity: 0, x: flipX(-x), y }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : undefined}
      transition={{
        ease: EASE.enter,
        duration: DURATION.reveal,
        delay: delay + order * STAGGER.item,
      }}
      onAnimationStart={onAnimationStart}
    >
      {children}
    </Tag>
  )
}
