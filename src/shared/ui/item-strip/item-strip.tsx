import * as React from "react"

// One item of a list page in the strip: its card carries the same `key` in
// `data-item`.
export type StripItem = {
  key: string
  label: string
  // A project's status as a rhombus; a post or an album is `plain`.
  state: "done" | "active" | "archived" | "plain"
  // Under the rhombus, in mono: a post's month, an album's photos.
  note?: string
  // In the line over the strip while pointed at, else the `note`: a
  // project's status.
  detail?: string
}

const MONO =
  "font-zsd-label-mono text-zsd-label-mono uppercase text-zsd-on-surface-muted rtl:normal-case"

const cardOf = (key: string) =>
  document.querySelector<HTMLElement>(`[data-item="${CSS.escape(key)}"]`)

// Pointing devices only: a touch screen has no hover to tie the two.
const hovers = () => window.matchMedia("(hover: hover)").matches

// The item pointed at, in the strip or by its card; its card gets
// `data-hot` (index.css › item strip) for as long.
function useHot() {
  const [hot, setHot] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!hovers()) return
    const over = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target?.closest(".item-strip")) return
      setHot(target?.closest("[data-item]")?.getAttribute("data-item") ?? null)
    }
    document.addEventListener("pointerover", over)
    return () => document.removeEventListener("pointerover", over)
  }, [])
  React.useEffect(() => {
    const card = hot && cardOf(hot)
    if (!card) return
    card.setAttribute("data-hot", "")
    return () => card.removeAttribute("data-hot")
  }, [hot])
  return [hot, setHot] as const
}

// The strip of a list page's items (docs/design-brief.md › Арт-дирекция
// этапа 7 › База, 5; DESIGN.md › Item strip): a rhombus per item on a
// hairline from the start edge, its state from the data. Pointing at a
// rhombus lights the thread up to it and its card; pointing at a card lights
// its rhombus; a click brings the card into view. Over it a mono line: the
// `summary`, or the item pointed at. Decoration: the cards stay the links.
export function ItemStrip({
  items,
  summary,
}: {
  items: StripItem[]
  summary: string
}) {
  const [hot, setHot] = useHot()
  if (items.length === 0) return null
  const at = hot ? items.findIndex((item) => item.key === hot) : -1
  const shown = at >= 0 ? items[at] : null

  const bring = (key: string) => {
    const card = cardOf(key)
    card?.scrollIntoView({ block: "center" })
  }

  return (
    <div
      data-testid="item-strip"
      aria-hidden="true"
      className="item-strip mt-zsd-xl"
    >
      <p className={`${MONO} min-h-lh`}>
        {shown ? (
          <>
            <span className="text-zsd-primary-text">
              {String(at + 1).padStart(2, "0")}
            </span>
            {" · "}
            <span className="text-zsd-on-surface normal-case">
              {shown.label}
            </span>
            {(shown.detail ?? shown.note) && ` · ${shown.detail ?? shown.note}`}
          </>
        ) : (
          summary
        )}
      </p>
      <ol
        data-lit={at >= 0}
        className="item-strip-row mt-zsd-md"
        style={
          {
            "--count": items.length,
            "--at": Math.max(at, 0),
          } as React.CSSProperties
        }
      >
        {items.map((item, i) => (
          <li key={item.key} className="item-strip-cell">
            <span
              data-state={item.state}
              data-hot={hot === item.key}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setHot(item.key)
              }}
              onPointerLeave={() => setHot(null)}
              onClick={() => bring(item.key)}
              className="item-strip-tile"
              style={{ "--i": i } as React.CSSProperties}
            />
            {item.note && (
              <span className={`${MONO} item-strip-note`}>{item.note}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
