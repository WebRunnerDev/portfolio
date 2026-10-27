import { lazy, Suspense, use, type CSSProperties } from "react"
import { Link } from "@tanstack/react-router"

import type { Profile } from "@contracts/api/public"
import { useLang, useT } from "@/shared/i18n"
import { STAGGER } from "@/shared/lib/motion"
import { fallbackLang } from "@/shared/ui/fallback-notice"

import type { HeroTier } from "../model/tier"
import { HeroBrand } from "./hero-brand"
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

// Lazy: the Kinetic Grid stays out of the initial JS (ADR-0006). If its
// chunk doesn't load, `lite` stays.
const HeroFull = lazy(() =>
  import("./hero-full").then(
    (m) => ({ default: m.HeroFull }),
    () => ({ default: HeroLite })
  )
)

// The effect behind the text. `full` shows `lite` while its chunk loads.
function HeroEffect({
  tier,
  onFullFail,
}: {
  tier: HeroTier
  onFullFail: () => void
}) {
  if (tier === "static") return <HeroStatic />
  if (tier === "lite") return <HeroLite />
  return (
    <Suspense fallback={<HeroLite />}>
      <HeroFull onFail={onFullFail} />
    </Suspense>
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

// The home page's hero (docs/design-brief.md › Hero, ADR-0006): the brand,
// the subtitle and the two main actions over the effect of the Hero Tier.
// One viewport tall less the header. The effect spans the whole hero up to
// the viewport's edges and is never mirrored; the text follows the Direction.
// `onFullFail` is called when `full` can't hold on this device after all.
export function Hero({
  tier,
  profile,
  onFullFail,
}: {
  tier: HeroTier
  profile: Promise<HeroProfile | null>
  onFullFail: () => void
}) {
  const lang = useLang()
  const t = useT()

  return (
    <section
      data-tier={tier}
      className="relative isolate flex min-h-[max(480px,calc(100svh-var(--zsd-x-zsd-layout-header-height)-var(--zsd-x-zsd-border-width-default)))] overflow-hidden"
    >
      <div aria-hidden="true" dir="ltr" className="absolute inset-0 -z-10">
        <HeroEffect tier={tier} onFullFail={onFullFail} />
      </div>
      <div className="mx-auto flex w-full max-w-(--zsd-x-zsd-layout-content-max) flex-col justify-center px-zsd-lg py-zsd-section md:px-zsd-xxl">
        <HeroBrand />
        <p
          style={delay(SUBTITLE_START)}
          className="mt-zsd-xl min-h-[3lh] max-w-(--zsd-x-zsd-layout-prose-max) font-zsd-body-lg text-zsd-body-lg text-balance text-zsd-on-surface-muted lg:ms-[calc(100%/3)]"
        >
          <Suspense>
            <HeroSubtitle profile={profile} />
          </Suspense>
        </p>
        <div className="mt-zsd-lg flex flex-wrap gap-zsd-md lg:ms-[calc(100%/3)]">
          <Link
            to="/$lang/cv"
            params={{ lang }}
            style={delay(ACTIONS_START)}
            className="group/btn focus-chamfer-sm relative hero-in hover:elevation-accent focus-visible:elevation-accent"
          >
            <span
              className={`flex h-zsd-control-height items-center bg-zsd-primary px-zsd-lg font-zsd-label-md text-zsd-label-md text-zsd-on-primary chamfer-sm group-hover/btn:bg-zsd-primary-hover ${MOTION_FAST}`}
            >
              {t("home.cv")}
            </span>
          </Link>
          <Link
            to="/$lang/projects"
            params={{ lang }}
            style={delay(ACTIONS_START + STAGGER.item)}
            className={`inline-flex h-zsd-control-height hero-in items-center border border-zsd-outline bg-zsd-surface px-zsd-lg font-zsd-label-md text-zsd-label-md text-zsd-on-surface hover:bg-zsd-surface-raised ${FOCUS_RING} ${MOTION_FAST}`}
          >
            {t("home.projects")}
          </Link>
        </div>
      </div>
    </section>
  )
}
