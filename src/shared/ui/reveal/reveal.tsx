import * as React from "react"

import { cn } from "@/shared/lib/utils"
import { useDirection } from "@/shared/lib/direction"
import { STAGGER } from "@/shared/lib/motion"

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
// viewport, once (`reveal-*` in index.css). Under reduced motion it is there
// from the start.
export function Reveal({
  children,
  as: Tag = "div",
  className,
  delay = 0,
  order = 0,
  x = 0,
  y = x === 0 ? 24 : 0,
}: RevealProps) {
  const { flipX } = useDirection()
  const { ref, animated, inView, onAnimationStart } = useReveal<HTMLElement>()

  if (!animated) {
    return (
      <Tag ref={ref as React.Ref<never>} className={className}>
        {children}
      </Tag>
    )
  }

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(className, inView ? "reveal-in" : "reveal-out")}
      style={
        {
          "--reveal-x": `${flipX(-x)}px`,
          "--reveal-y": `${y}px`,
          "--reveal-delay": `${delay + order * STAGGER.item}s`,
        } as React.CSSProperties
      }
      onAnimationStart={onAnimationStart}
    >
      {children}
    </Tag>
  )
}
