import darkLandscape from "./swarm-dark-landscape.webp"
import darkPortrait from "./swarm-dark-portrait.webp"
import lightLandscape from "./swarm-light-landscape.webp"
import lightPortrait from "./swarm-light-portrait.webp"

// Sizes of the frames (scripts/generate-hero-static.mjs): the hero at
// 1440 × 900 and at 390 × 844, where the scene lays the logo square at each
// breakpoint.
const LANDSCAPE = { width: 1440, height: 843 }
const PORTRAIT = { width: 585, height: 1181 }
const PORTRAIT_MEDIA = "(orientation: portrait)"

// Covers the hero from its end corner, where the dust logo sits (the effect
// layer is LTR: the scene never mirrors).
const IMAGE = "absolute inset-0 size-full object-cover object-right-bottom"

function Frame({
  landscape,
  portrait,
  className,
}: {
  landscape: string
  portrait: string
  className: string
}) {
  return (
    <picture>
      <source media={PORTRAIT_MEDIA} srcSet={portrait} {...PORTRAIT} />
      <img
        src={landscape}
        alt=""
        {...LANDSCAPE}
        loading="lazy"
        decoding="async"
        className={`${IMAGE} ${className}`}
      />
    </picture>
  )
}

// The hero at the `static` Motion Tier: the Swarm at rest as a still, one
// per theme, portrait on a tall screen. Lazy, so the hidden theme's image
// never loads. It sits in an absolute layer: CLS 0 whenever it arrives.
export function HeroStatic() {
  return (
    <div data-effect="static" className="absolute inset-0">
      <Frame
        landscape={lightLandscape}
        portrait={lightPortrait}
        className="dark:hidden"
      />
      <Frame
        landscape={darkLandscape}
        portrait={darkPortrait}
        className="hidden dark:block"
      />
    </div>
  )
}
