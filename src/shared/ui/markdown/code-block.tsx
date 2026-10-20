// A fenced code block: its text and the language after the fence, if any.
// Code is never mirrored (ADR-0007) and scrolls in its own region, which takes
// focus so the keyboard can scroll it (DESIGN.md › Responsive behavior).
// Stage 5 highlights it here with Shiki; the Markdown stays the same.
export function CodeBlock({
  code,
  language,
}: {
  code: string
  language: string | undefined
}) {
  return (
    <pre
      dir="ltr"
      tabIndex={0}
      data-language={language}
      className="overflow-x-auto border border-zsd-outline-muted bg-zsd-surface-raised p-zsd-lg font-zsd-code-md text-zsd-code-md text-zsd-on-surface outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <code>{code}</code>
    </pre>
  )
}
