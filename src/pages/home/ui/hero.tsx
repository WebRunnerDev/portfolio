import {
  lazy,
  Suspense,
  use,
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
  type RefObject,
} from "react"
import { Link } from "@tanstack/react-router"

import type { Profile } from "@contracts/api/public"
import { useLang, useT } from "@/shared/i18n"
import { useLogoFlight } from "@/shared/lib/logo-flight"
import { STAGGER } from "@/shared/lib/motion"
import type { MotionTier } from "@/shared/lib/motion-tier"
import { fallbackLang } from "@/shared/ui/fallback-notice"

import { HeroBrand } from "./hero-brand"
import { CONTENT_START } from "./home-section"
import { HeroLite } from "./hero-lite"
import { HeroStatic } from "./hero-static"

export type HeroProfile = Pick<Profile, "name" | "headline" | "fallback">

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
const MOTION_FAST =
  "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none"

// docs/design-brief.md › Load choreography: the subtitle at 400 ms, the
// actions from 600 ms, `stagger-item` apart.
const SUBTITLE_START = 0.4
const ACTIONS_START = 0.6
const delay = (seconds: number) =>
  ({ "--hero-delay": `${seconds}s` }) as CSSProperties

type HeroFullProps = {
  onFail: () => void
  onShown: () => void
  tiles: RefObject<Element | null>
}

// What a full chunk that didn't load renders: nothing, and `full` fails.
function FullFailed({ onFail }: HeroFullProps) {
  useEffect(onFail, [onFail])
  return null
}

// Lazy: the full layer, the Cast Lattice, stays out of the initial JS and
// the modulepreloads; it is imported only once the tier is `full`, which
// waits for the input gate (ADR-0012). A chunk that doesn't load fails
// `full`: `lite` for the rest of the visit.
const HeroFull = lazy<ComponentType<HeroFullProps>>(() =>
  import("./hero-full").then(
    (m) => ({ default: m.HeroFull }),
    () => ({ default: FullFailed })
  )
)

// The effect behind the text. At `full`, `lite` stays in the same place
// under the scene while its chunk loads and until its first frame has faded
// in over it (ADR-0012), then leaves.
function HeroEffect({
  tier,
  tiles,
  onFullFail,
}: {
  tier: MotionTier
  tiles: RefObject<Element | null>
  onFullFail: () => void
}) {
  const [covered, setCovered] = useState(false)
  if (tier === "static") return <HeroStatic />
  return (
    <>
      {(tier === "lite" || !covered) && <HeroLite />}
      {tier === "full" && (
        <Suspense>
          <HeroFull
            tiles={tiles}
            onFail={onFullFail}
            onShown={() => setCovered(true)}
          />
        </Suspense>
      )}
    </>
  )
}

// The real name and the headline from the Profile, once it loads; nothing
// while there is none. Its two lines are held from the start, so nothing
// below moves when it arrives.
function HeroSubtitle({ profile }: { profile: Promise<HeroProfile | null> }) {
  const value = use(profile)
  if (!value) return null
  return (
    <span lang={fallbackLang(value)} className="block hero-in">
      <span className="block text-zsd-on-surface">{value.name}</span>
      {value.headline}
    </span>
  )
}

// The home page's hero (docs/design-brief.md › Hero, ADR-0006, ADR-0012):
// the brand, the subtitle and the two main actions over the effect of the
// Motion Tier.
// One viewport tall less the header. The effect spans the whole hero up to
// the viewport's edges and is never mirrored; the text follows the Direction.
// Its logo tiles fly into the header's as it scrolls away, but at `static`.
// `onFullFail` is called when `full` can't hold on this device after all.
export function Hero({
  tier,
  profile,
  onFullFail,
}: {
  tier: MotionTier
  profile: Promise<HeroProfile | null>
  onFullFail: () => void
}) {
  const lang = useLang()
  const t = useT()
  const { heroRef, tilesRef } = useLogoFlight(tier !== "static")

  return (
    <section
      ref={heroRef}
      data-tier={tier}
      className={`${tier === "static" ? "" : "logo-flight-hero"} relative isolate flex min-h-[max(480px,calc(100svh-var(--zsd-x-zsd-layout-header-height)-var(--zsd-x-zsd-border-width-default)))] overflow-hidden`}
    >
      <div aria-hidden="true" dir="ltr" className="absolute inset-0 -z-10">
        <HeroEffect tier={tier} tiles={tilesRef} onFullFail={onFullFail} />
      </div>
      <div className="mx-auto flex w-full max-w-(--zsd-x-zsd-layout-content-max) flex-col justify-center px-zsd-lg py-zsd-section md:px-zsd-xxl">
        <HeroBrand tiles={tilesRef} />
        <p
          style={delay(SUBTITLE_START)}
          className={`mt-zsd-xl min-h-[3lh] max-w-(--zsd-x-zsd-layout-prose-max) font-zsd-body-lg text-zsd-body-lg text-balance text-zsd-on-surface-muted ${CONTENT_START}`}
        >
          <Suspense>
            <HeroSubtitle profile={profile} />
          </Suspense>
        </p>
        <div className={`mt-zsd-lg flex flex-wrap gap-zsd-md ${CONTENT_START}`}>
          <Link
            to="/$lang/cv"
            params={{ lang }}
            style={delay(ACTIONS_START)}
            className="group/btn focus-chamfer-sm relative hero-in hover:elevation-accent focus-visible:elevation-accent active:elevation-accent"
          >
            <span
              className={`flex h-zsd-control-height items-center bg-zsd-primary px-zsd-lg font-zsd-label-md text-zsd-label-md text-zsd-on-primary chamfer-sm group-hover/btn:bg-zsd-primary-hover group-focus-visible/btn:bg-zsd-primary-hover group-active/btn:bg-zsd-primary-hover ${MOTION_FAST}`}
            >
              {t("home.cv")}
            </span>
          </Link>
          <Link
            to="/$lang/projects"
            params={{ lang }}
            style={delay(ACTIONS_START + STAGGER.item)}
            className={`inline-flex h-zsd-control-height hero-in items-center border border-zsd-outline bg-zsd-surface px-zsd-lg font-zsd-label-md text-zsd-label-md text-zsd-on-surface hover:bg-zsd-surface-raised focus-visible:bg-zsd-surface-raised active:bg-zsd-surface-raised ${FOCUS_RING} ${MOTION_FAST}`}
          >
            {t("home.projects")}
          </Link>
        </div>
      </div>
    </section>
  )
}
