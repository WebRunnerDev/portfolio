// PROTOTYPE, branch spike/page-head only, never merged to main.
// docs/plan.md › Этап 7 › п. 10, `?head=`: the head of a list page (Projects,
// Gallery, Blog). Wraps the page's h1 (`children`):
//  - `chapter`: the page is its home chapter opened. The same rule, the
//    chapter's outline figure with its rust full stop and the title in the
//    first quarter, and on the content line a readout of what is in it;
//  - `data`: under the title a strip of the page's own items, one rhombus
//    each, on a hairline. A rhombus shows the item's state (a project's
//    status, a post's date, an album's photos); pointing at it lights the
//    thread up to it and its card below, pointing at a card lights its
//    rhombus, a click brings the card into view;
//  - `both`: the chapter, the strip in the readout's place.
// No scene, no canvas: CSS and the page's data.
import * as React from "react"

import { proto, prototypeShown } from "@/shared/lib/prototype"
import { Reveal } from "@/shared/ui/reveal"

export type HeadItem = {
  // The card's `data-item`.
  key: string
  label: string
  state: "done" | "active" | "archived" | "plain"
  // Under the rhombus, in mono: a date, a count.
  note?: string
}

// The content box splits in four from `lg`, as a home chapter.
const CHAPTER = "lg:grid lg:grid-cols-4 lg:gap-x-zsd-xxl"
const MONO =
  "font-zsd-label-mono text-zsd-label-mono uppercase text-zsd-on-surface-muted rtl:normal-case"

function useHot() {
  const [hot, setHot] = React.useState<string | null>(null)
  // A card pointed at lights its rhombus.
  React.useEffect(() => {
    const over = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target?.closest?.(".page-strip-row")) return
      const card = target?.closest?.("[data-item]")
      setHot(card?.getAttribute("data-item") ?? null)
    }
    document.addEventListener("pointerover", over)
    return () => document.removeEventListener("pointerover", over)
  }, [])
  // …and a rhombus pointed at lights its card.
  React.useEffect(() => {
    if (!hot) return
    const card = document.querySelector(`[data-item="${CSS.escape(hot)}"]`)
    card?.setAttribute("data-hot", "")
    return () => card?.removeAttribute("data-hot")
  }, [hot])
  return [hot, setHot] as const
}

function Strip({ items, summary }: { items: HeadItem[]; summary: string }) {
  const [hot, setHot] = useHot()
  const at = hot ? items.findIndex((item) => item.key === hot) : -1
  const shown = at >= 0 ? items[at] : null

  const bring = (key: string) => {
    const card = document.querySelector<HTMLElement>(
      `[data-item="${CSS.escape(key)}"]`
    )
    if (!card) return
    card.scrollIntoView({ block: "center", behavior: "smooth" })
    card.querySelector<HTMLElement>("a")?.focus({ preventScroll: true })
  }

  return (
    <div>
      <p className={`${MONO} min-h-[1lh]`}>
        {shown ? (
          <>
            <span className="text-zsd-primary-text">
              {String(at + 1).padStart(2, "0")}
            </span>
            {" · "}
            <span className="text-zsd-on-surface normal-case">
              {shown.label}
            </span>
            {shown.note && ` · ${shown.note}`}
          </>
        ) : (
          summary
        )}
      </p>
      <ol
        aria-hidden="true"
        className="page-strip-row mt-zsd-md"
        style={
          {
            "--count": items.length,
            "--at": Math.max(at, 0),
          } as React.CSSProperties
        }
        data-lit={at >= 0}
      >
        {items.map((item, i) => (
          <li key={item.key} className="page-strip-cell">
            <button
              type="button"
              tabIndex={-1}
              data-state={item.state}
              data-hot={hot === item.key}
              onPointerEnter={() => setHot(item.key)}
              onPointerLeave={() => setHot(null)}
              onClick={() => bring(item.key)}
              className="page-strip-tile"
              style={{ "--i": i } as React.CSSProperties}
            />
            {item.note && (
              <span className={`${MONO} page-strip-note`}>{item.note}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function PageHead({
  figure,
  items,
  summary,
  children,
}: {
  // The page's chapter on the home page: 3 for Projects.
  figure: number
  items: HeadItem[]
  // What is in it, in a line: "4 projects · 1 in progress".
  summary: string
  children: React.ReactNode
}) {
  const head = prototypeShown() ? proto("head") : "plain"
  if (head === "plain") return <>{children}</>

  if (head === "data") {
    return (
      <div>
        {children}
        <div className="mt-zsd-xl">
          <Strip items={items} summary={summary} />
        </div>
      </div>
    )
  }

  // `chapter`, `both`: the chapter opened. The counter is the home page's.
  return (
    <div className="chapter" style={{ counterReset: `home-section ${figure}` }}>
      <Reveal y={0} className="chapter-open pt-zsd-md">
        {null}
      </Reveal>
      <div className={`mt-zsd-lg ${CHAPTER}`}>
        <div>
          <span aria-hidden="true" className="mb-zsd-md chapter-numeral">
            <span className="chapter-figure">
              <span className="relative chapter-stop" />
            </span>
          </span>
          {children}
        </div>
        <div className="mt-zsd-xl lg:col-span-3 lg:mt-0 lg:self-end">
          {head === "both" ? (
            <Strip items={items} summary={summary} />
          ) : (
            <p className={MONO}>{summary}</p>
          )}
        </div>
      </div>
    </div>
  )
}
