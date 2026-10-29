import * as React from "react"

import { cn } from "@/shared/lib/utils"
import { STAGGER } from "@/shared/lib/motion"

import { useReveal } from "./use-reveal"

type RevealTextTag = "h1" | "h2" | "h3" | "p" | "span"

export type RevealTextProps = {
  // `\n` breaks a line by hand (DESIGN.md › Typography: display headings).
  text: string
  as?: RevealTextTag
  // Words move one by one, `stagger-word` apart; lines move whole.
  by?: "word" | "line"
  className?: string
  // Seconds before the first part starts.
  delay?: number
}

// The mask is taller than the text by this much on both sides, so accents
// and descenders aren't cut at a tight line height; the part starts far
// enough down to hide below it (`reveal-rise`, index.css).
const MASK = "overflow-hidden py-[0.15em] -my-[0.15em]"

// DESIGN.md › Motion: text moves up from under a mask, part by part, once it
// enters the viewport. Screen readers get the text in one piece. Under
// reduced motion the text is there from the start.
export function RevealText({
  text,
  as: Tag = "h2",
  by = "word",
  className,
  delay = 0,
}: RevealTextProps) {
  const { ref, animated, inView, onAnimationStart } = useReveal<HTMLElement>()
  const lines = text.split("\n")

  if (!animated) {
    return (
      <Tag ref={ref as React.Ref<never>} className={className}>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </Tag>
    )
  }

  // Each line's parts, and where its first one is in the whole stagger.
  const parts = lines.map((line) =>
    by === "line" ? [line] : line.trim().split(/\s+/)
  )
  const firsts = parts.map((_, i) =>
    parts.slice(0, i).reduce((sum, line) => sum + line.length, 0)
  )

  const part = (content: string, order: number, className: string) => (
    <span key={order} className={cn(MASK, className)}>
      <span
        className={cn("inline-block", inView ? "reveal-rise" : "reveal-under")}
        style={
          {
            "--reveal-delay": `${delay + order * STAGGER.word}s`,
          } as React.CSSProperties
        }
      >
        {content}
      </span>
    </span>
  )

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={className}
      onAnimationStart={onAnimationStart}
    >
      <span className="sr-only">{lines.join(" ")}</span>
      <span aria-hidden="true">
        {parts.map((line, i) =>
          by === "line" ? (
            part(line[0], firsts[i], "block")
          ) : (
            <span key={i} className="block">
              {line.map((word, j) => (
                <React.Fragment key={j}>
                  {j > 0 && " "}
                  {part(
                    word,
                    firsts[i] + j,
                    "inline-block align-bottom wrap-anywhere"
                  )}
                </React.Fragment>
              ))}
            </span>
          )
        )}
      </span>
    </Tag>
  )
}
