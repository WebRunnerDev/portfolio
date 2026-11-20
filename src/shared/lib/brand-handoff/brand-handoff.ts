import { useEffect, useRef } from "react"

import { DURATION } from "@/shared/lib/motion"

// DESIGN.md › Tile, docs/design-brief.md › Хедер: on the home page the hero
// shows one logo, its effect's, and the brand says the name. The header's
// lockup stays empty while the brand is below the header and fills once the
// brand has gone under it: the logo shows in its slot, the name comes out
// from under it. Back on the way up. The classes are the contract, with
// `index.css` › Brand handoff:
// - `brand-handoff-from` on the hero's brand (the hook's ref);
// - `brand-handoff-to` on the header logo;
// - `brand-handoff-name` on the header's name.
// A class, not an import: the header stays out of the home page's chunk.
//
// The root's `data-brand-handoff` is `hero` while the brand shows below the
// header (`scroll-padding-top`), `header` once it has gone. In time, not on
// the scroll: a logo held half shown by a stopped scroll would look like a
// bug. Every Motion Tier, so two logos never show at once.
//
// The menu holds the lockup shown while it is open (`data-brand-hold`):
// its tiles leave the header logo, never an empty slot.
export function useBrandHandoff<T extends Element>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const brand = ref.current
    if (!brand) return
    const root = document.documentElement
    const inset = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        root.dataset.brandHandoff = entry.isIntersecting ? "hero" : "header"
      },
      { rootMargin: `-${inset}px 0px 0px` }
    )
    observer.observe(brand)
    return () => {
      observer.disconnect()
      delete root.dataset.brandHandoff
    }
  }, [])

  return ref
}

const root = () => document.documentElement
let released: ReturnType<typeof setTimeout> | undefined

// The menu opens: the header lockup shows, on the home page too while the
// hero's brand is in view. How long until the logo stands in its slot, in
// seconds: it grows in (`duration-slow`) when it was waiting, else 0.
export function holdBrand(): number {
  clearTimeout(released)
  const { dataset } = root()
  const waits =
    document.querySelector(".brand-handoff-from") !== null &&
    dataset.brandHandoff !== "header" &&
    dataset.brandHold !== "on"
  dataset.brandHold = "on"
  return waits ? DURATION.slow : 0
}

// The menu has closed, its tiles back in the logo `after` seconds from now:
// then the lockup goes back to waiting for the brand, shrinking out of its
// slot (`data-brand-hold="off"`) if the brand is in view.
export function releaseBrand(after: number) {
  const { dataset } = root()
  if (!dataset.brandHold) return
  clearTimeout(released)
  released = setTimeout(() => {
    dataset.brandHold = "off"
    released = setTimeout(() => delete dataset.brandHold, DURATION.slow * 1000)
  }, after * 1000)
}
