import gridDark from "./grid-dark.webp"
import gridLight from "./grid-light.webp"

// Size of the images (scripts/generate-hero-static.mjs). Shown at their own
// size and cropped, so the grid step stays the same on every screen.
const WIDTH = 2560
const HEIGHT = 1440

const IMAGE = "absolute inset-0 size-full object-none object-center"

// The `static` Hero Tier: the grid of the Kinetic Grid as a still image, one
// per theme. Lazy, so the hidden theme's image never loads. It sits in an
// absolute layer: CLS 0 whenever it arrives.
export function HeroStatic() {
  return (
    <div data-effect="static" className="absolute inset-0">
      <img
        src={gridLight}
        alt=""
        width={WIDTH}
        height={HEIGHT}
        loading="lazy"
        decoding="async"
        className={`${IMAGE} dark:hidden`}
      />
      <img
        src={gridDark}
        alt=""
        width={WIDTH}
        height={HEIGHT}
        loading="lazy"
        decoding="async"
        className={`${IMAGE} hidden dark:block`}
      />
    </div>
  )
}
