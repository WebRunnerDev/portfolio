import type { CSSProperties } from "react"

import type { Token } from "@contracts/markdown/tree"

// A fenced code block: its text, the language after the fence, if any, and
// the lines Shiki coloured on the Worker (`markdownTree`), if it knows the
// language; any other block is the plain text. Code is never mirrored
// (ADR-0007) and scrolls in its own region, which takes focus so the keyboard
// can scroll it (DESIGN.md › Responsive behavior). Each token carries both
// themes' colours as CSS variables and `.shiki-token` picks one by the theme
// class, so a theme switch only repaints.
export function CodeBlock({
  code,
  language,
  lines,
}: {
  code: string
  language: string | undefined
  lines: Token[][] | undefined
}) {
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
