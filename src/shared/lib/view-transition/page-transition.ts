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

// PROTOTYPE (spike/page-head, `?morph=on`): a title on a card or a row and
// the h1 of its page, the same key as the cover. Spread on the element that
// hugs the text (inline-block), so its box keeps the text's shape.
export const sharedTitle = (kind: CoverKind, slug: string) => ({
  "data-shared-title": `${kind}:${slug}`,
})

const morphOn = () => {
  try {
    return (
      document.documentElement.dataset.protoMorph === "on" &&
      location.hostname !== "webrunner.dev"
    )
  } catch {
    return false
  }
}

// One rule names the cover of the item being opened or left, on both sides
// of the transition, so the browser morphs one into the other. It stays until
// the next page change; a name does nothing outside a transition.
let rule: HTMLStyleElement | undefined

function shareCover(key: string | null) {
  const selector = key && `[data-shared-cover="${CSS.escape(key)}"]`
  // Only a cover on the page being left: none means nothing to morph from.
  const cover =
    selector && document.querySelector(selector)
      ? `${selector}{view-transition-name:card-cover}`
      : ""
  const titleSelector =
    key && morphOn() && `[data-shared-title="${CSS.escape(key)}"]`
  const title =
    titleSelector && document.querySelector(titleSelector)
      ? `${titleSelector}{view-transition-name:page-title}`
      : ""
  const css = cover + title
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

// ADR-0014: from the home page (`/{lang}`) to a page that isn't one. While
// the home page's Swarm runs, that change goes without a View Transition: a
// snapshot can't hold the live canvas, whose dust blows off over the next
// page. Another Lang's home page is a View Transition as before.
export function leavesHome({
  fromLocation,
  toLocation,
  pathChanged,
}: LocationChange): boolean {
  return (
    pathChanged &&
    fromLocation !== undefined &&
    segments(fromLocation.pathname).length === 1 &&
    segments(toLocation.pathname).length !== 1
  )
}
