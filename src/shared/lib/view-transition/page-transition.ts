// ADR-0005, DESIGN.md › Motion: which way a page change goes, and the cover
// a card shares with its page. The router asks `pageTransitionTypes` before
// each View Transition (`defaultViewTransition` in src/main.tsx); index.css
// animates by the types it returns.

type Location = { pathname: string }

export type LocationChange = {
  fromLocation?: Location
  toLocation: Location
  pathChanged: boolean
}

export type CoverKind = "project" | "post" | "album"

const COVER_SECTIONS: Record<string, CoverKind> = {
  projects: "project",
  blog: "post",
  gallery: "album",
}

const segments = (pathname: string) => pathname.split("/").filter(Boolean)

// Into the site's hierarchy (a list to its item, home to a section) is
// `forward`, out of it `back`; between pages on one level (the menu, another
// Lang) there is no direction.
export function transitionDirection(
  from: string,
  to: string
): "forward" | "back" | null {
  const depth = segments(to).length - segments(from).length
  if (depth > 0) return "forward"
  if (depth < 0) return "back"
  return null
}

// `/{lang}/{section}/{slug}` of a card's page → the key its cover carries on
// the card and on the page, e.g. `project:plotops`.
export function coverKey(pathname: string): string | null {
  const [, section, slug, ...rest] = segments(pathname)
  const kind = COVER_SECTIONS[section]
  return kind && slug && rest.length === 0 ? `${kind}:${slug}` : null
}

// Spread on the cover's `<img>` on a card and on its page.
export const sharedCover = (kind: CoverKind, slug: string) => ({
  "data-shared-cover": `${kind}:${slug}`,
})

// One rule names the cover of the item being opened or left, on both sides
// of the transition, so the browser morphs one into the other. It stays until
// the next page change; a name does nothing outside a transition.
let rule: HTMLStyleElement | undefined

function shareCover(key: string | null) {
  const selector = key && `[data-shared-cover="${CSS.escape(key)}"]`
  // Only a cover on the page being left: none means nothing to morph from.
  const css =
    selector && document.querySelector(selector)
      ? `${selector}{view-transition-name:card-cover}`
      : ""
  if (!rule) {
    if (!css) return
    rule = document.head.appendChild(document.createElement("style"))
  }
  rule.textContent = css
}

export function pageTransitionTypes({
  fromLocation,
  toLocation,
  pathChanged,
}: LocationChange): string[] {
  const from = fromLocation?.pathname
  const to = toLocation.pathname
  const direction =
    from !== undefined && pathChanged ? transitionDirection(from, to) : null
  // The item's own page is the deeper side.
  shareCover(direction && coverKey(direction === "forward" ? to : from!))
  return direction ? [direction] : []
}
