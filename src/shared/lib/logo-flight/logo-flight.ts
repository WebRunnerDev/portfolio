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
//   slot's box is measured, the logo in it moves.
// A class, not an import: the header stays out of the home page's chunk.

type Box = Pick<DOMRect, "left" | "top" | "bottom" | "width">

// Where the header logo starts, from its slot, and how much larger: over the
// hero's tiles as they are when the flight starts, at `exit 0%` of the hero's
// view timeline. That timeline sees the viewport below the header (`view`:
// `scroll-padding-top` to the bottom), so the flight starts once the hero's
// top reaches the header, or its bottom the viewport's bottom when it is
// taller. Boxes from getBoundingClientRect, at any scroll.
export function flightStart(
  tiles: Box,
  slot: Box,
  hero: Box,
  view: Pick<Box, "top" | "bottom">
) {
  const scrolled = Math.max(hero.top - view.top, hero.bottom - view.bottom)
  return {
    x: tiles.left - slot.left,
    y: tiles.top - scrolled - slot.top,
    scale: tiles.width / slot.width,
  }
}

// The hero's side of the flight: refs for the hero and its tiles. Measures
// the start on mount, once the fonts are in and on resize, into CSS
// variables on the root. Off (`static`, reduced motion): the tiles stand in
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
      const start = flightStart(
        from.getBoundingClientRect(),
        slot.getBoundingClientRect(),
        section.getBoundingClientRect(),
        { top: inset(), bottom: root.clientHeight }
      )
      // Plain numbers: `index.css` adds the units.
      for (const [key, value] of Object.entries(start)) {
        root.style.setProperty(`--logo-flight-${key}`, `${value}`)
      }
    }
    measure()
    document.fonts.ready.then(measure)
    addEventListener("resize", measure)

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
      observer.disconnect()
      delete root.dataset.logoFlight
    }
  }, [on])

  return { heroRef, tilesRef }
}
