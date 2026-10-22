import { useEffect, useState, type CSSProperties } from "react"

import type { Token } from "./highlighter"
import { isHighlighted } from "./languages"

// A fenced code block: its text and the language after the fence, if any.
// Code is never mirrored (ADR-0007) and scrolls in its own region, which takes
// focus so the keyboard can scroll it (DESIGN.md › Responsive behavior).
// A known language is highlighted with Shiki, loaded only now; until then (and
// for any other language) the block is the same text uncoloured, so nothing
// moves. Each token carries both themes' colours as CSS variables and
// `.shiki-token` picks one by the theme class, so a theme switch repaints
// without highlighting again.
export function CodeBlock({
  code,
  language,
}: {
  code: string
  language: string | undefined
}) {
  const [highlighted, setHighlighted] = useState<{
    code: string
    language: string
    lines: Token[][]
  } | null>(null)

  useEffect(() => {
    if (!language || !isHighlighted(language)) return
    let current = true
    import("./highlighter")
      .then(({ highlight }) => highlight(code, language))
      .then((lines) => {
        if (current && lines) setHighlighted({ code, language, lines })
      })
      // Shiki failed to load: the plain text stays.
      .catch(() => {})
    return () => {
      current = false
    }
  }, [code, language])

  const lines =
    highlighted?.code === code && highlighted.language === language
      ? highlighted.lines
      : null

  return (
    <pre
      dir="ltr"
      tabIndex={0}
      data-language={language}
      data-highlighted={lines ? "" : undefined}
      className="overflow-x-auto border border-zsd-outline-muted bg-zsd-surface-raised p-zsd-lg font-zsd-code-md text-zsd-code-md text-zsd-on-surface outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <code>
        {lines
          ? lines.map((line, i) => (
              <span key={i}>
                {i > 0 && "\n"}
                {line.map((token, j) =>
                  token.light || token.dark ? (
                    <span
                      key={j}
                      className="shiki-token"
                      style={
                        {
                          "--shiki-light": token.light,
                          "--shiki-dark": token.dark,
                        } as CSSProperties
                      }
                    >
                      {token.content}
                    </span>
                  ) : (
                    token.content
                  )
                )}
              </span>
            ))
          : code}
      </code>
    </pre>
  )
}
