import { useEffect, useRef } from "react"

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
