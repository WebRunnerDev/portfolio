// DESIGN.md › Card: on hover and keyboard focus of its card (`card-active`)
// a rust tile grows out of the chamfered corner and fills the cut. The tile
// is a rhombus centred on the corner; the corner's box crops it to the
// triangle the chamfer took away. Goes in the card's positioned, unclipped
// element; mirrors under dir="rtl" with the chamfer. Decorative.
export function CardCorner() {
  return (
    <span
      aria-hidden="true"
      data-testid="card-corner"
      className="pointer-events-none absolute inset-e-0 top-0 size-(--zsd-x-zsd-border-chamfer-md) overflow-hidden"
    >
      <span className="absolute inset-e-0 top-0 size-full translate-x-1/2 -translate-y-1/2 scale-0 rotate-45 bg-zsd-primary transition-transform duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none rtl:-translate-x-1/2 card-active:scale-[1.415]" />
    </span>
  )
}

// The card's title moves 4px along the reading direction with the tile. On
// a span inside the title's link: a transform on the heading would hold the
// link's stretched `::after` inside it.
export const CARD_TITLE_SHIFT =
  "inline-block transition-transform duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover card-active:translate-x-1 motion-reduce:transition-none rtl:card-active:-translate-x-1"
