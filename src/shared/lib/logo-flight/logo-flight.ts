import { useEffect, useRef } from "react"

// DESIGN.md › Tile, docs/design-brief.md › Хедер: on the home page the
// hero's logo tiles fly into the header logo as the hero scrolls away. The
// header logo does the flying: it starts over the hero's tiles and lands in
// its slot, so it paints above the page. The classes are the contract, with
// `index.css` › Logo flight, which moves them on the hero's view timeline or
// flips between the two end states where there is none:
// - `logo-flight-hero` on the hero (the hook's `heroRef`), but at `static`;
// - `logo-flight-from` on its tiles (`tilesRef`);
// - `logo-flight-to` on the header logo, alone in a slot of its size: the
//   slot's box is measured, the logo in it moves;
// - `logo-flight-name` on the header's name, which comes out from under the
//   logo as it lands;
// - `data-rise` in the hero, at `full`, once the Cast Lattice's copies rise
//   into the tiles: the flight starts `--logo-flight-rise` into the exit.
// A class, not an import: the header stays out of the home page's chunk.

type Box = Pick<DOMRect, "left" | "top" | "bottom" | "width">
type View = Pick<Box, "top" | "bottom">

// The hero's view timeline sees the viewport below the header (`view`:
// `scroll-padding-top` to the bottom). How far the hero still is from
// `exit 0%`: its top from the header, or its bottom from the viewport's
// bottom when it is taller; negative once it is leaving.
const toExit = (hero: Box, view: View) =>
  Math.max(hero.top - view.top, hero.bottom - view.bottom)

// The length of the hero's `exit`: its height, or the view's when it is
// taller.
const exitLength = (hero: Box, view: View) =>
  Math.min(hero.bottom - hero.top, view.bottom - view.top)

// How far into its `exit` the hero is, 0 to 1: the progress of the
// `exit` range of its view timeline, read from boxes.
export function exitProgress(hero: Box, view: View) {
  const length = exitLength(hero, view)
  if (length <= 0) return 0
  return Math.min(1, Math.max(0, -toExit(hero, view) / length))
}

// At `full`, the Cast Lattice lifts copies of the tiles out of its field
// into the hero's tiles first, and the flight waits for them
// (docs/design-brief.md › Cast Lattice): the share of the `exit` they take.
// RISE at most, and less when the tiles are near the header, so they keep
// a quarter of their way to it and never go under it before they fly.
const RISE = 0.3
const KEEP = 0.75
export function riseShare(tiles: Box, hero: Box, view: View) {
  const length = exitLength(hero, view)
  if (length <= 0) return 0
  const way = tiles.top - toExit(hero, view) - view.top
  return Math.min(RISE, Math.max(0, (KEEP * way) / length))
}

// Where the header logo starts, from its slot, and how much larger: over the
// hero's tiles as they are when the flight starts, `at` into the hero's
// `exit` (`exit 0%` by default). The flight starts once the hero's top
// reaches the header, or its bottom the viewport's bottom when it is
// taller. Boxes from getBoundingClientRect, at any scroll.
export function flightStart(
  tiles: Box,
  slot: Box,
  hero: Box,
  view: View,
  at = 0
) {
  return {
    x: tiles.left - slot.left,
    y: tiles.top - toExit(hero, view) - at * exitLength(hero, view) - slot.top,
    scale: tiles.width / slot.width,
  }
}

// Where the logo shows now on a page with the flight: the header logo,
// landed or on its way, or the hero's tiles while they stand in for it.
// Null when neither shows (no header logo on the page). What the menu's
// tiles leave from and fold back into, so they never come from an empty
// slot.
export function shownLogo(): DOMRect | null {
  for (const selector of [".logo-flight-to", ".logo-flight-from"]) {
    const logo = document.querySelector(selector)
    if (logo && getComputedStyle(logo).opacity !== "0") {
      return logo.getBoundingClientRect()
    }
  }
  return null
}

// The hero's side of the flight: refs for the hero and its tiles. Measures
// the start on mount, once the fonts are in, on resize and when the hero's
// size changes (its Profile arrives), into CSS variables on the root. Off (`static`, reduced motion): the tiles stand in
// the header.
export function useLogoFlight(on: boolean) {
  const heroRef = useRef<HTMLElement>(null)
  const tilesRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const slot = document.querySelector(".logo-flight-to")?.parentElement
    const from = tilesRef.current
    const section = heroRef.current
    if (!on || !slot || !from || !section) return
    const root = document.documentElement
    const inset = () => parseFloat(getComputedStyle(root).scrollPaddingTop) || 0

    const measure = () => {
      const tiles = from.getBoundingClientRect()
      const hero = section.getBoundingClientRect()
      const box = slot.getBoundingClientRect()
      const view = { top: inset(), bottom: root.clientHeight }
      const rise = riseShare(tiles, hero, view)
      // Plain numbers: `index.css` adds the units. The start after the
      // Cast Lattice's rise is `rise`, `rise-y`.
      const values = {
        ...flightStart(tiles, box, hero, view),
        rise,
        "rise-y": flightStart(tiles, box, hero, view, rise).y,
      }
      for (const [key, value] of Object.entries(values)) {
        root.style.setProperty(`--logo-flight-${key}`, `${value}`)
      }
    }
    measure()
    document.fonts.ready.then(measure)
    addEventListener("resize", measure)
    const resized = new ResizeObserver(measure)
    resized.observe(section)

    // The end states, for the browsers without `timeline-scope`
    // (`data-logo-flight`): `hero` while the tiles show below the header,
    // `header` once they have gone under it. Others ignore it.
    const observer = new IntersectionObserver(
      ([entry]) => {
        root.dataset.logoFlight = entry.isIntersecting ? "hero" : "header"
      },
      { rootMargin: `-${inset()}px 0px 0px` }
    )
    observer.observe(from)

    return () => {
      removeEventListener("resize", measure)
      resized.disconnect()
      observer.disconnect()
      delete root.dataset.logoFlight
    }
  }, [on])

  return { heroRef, tilesRef }
}
