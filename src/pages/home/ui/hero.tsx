import { Suspense, use, useState, type CSSProperties } from "react"
import { Link } from "@tanstack/react-router"

import type { Profile } from "@contracts/api/public"
import { useLang, useT } from "@/shared/i18n"
import { useLogoFlight } from "@/shared/lib/logo-flight"
import { STAGGER } from "@/shared/lib/motion"
import { useMotionTier, type MotionTier } from "@/shared/lib/motion-tier"
import { fallbackLang } from "@/shared/ui/fallback-notice"

import { HeroBrand } from "./hero-brand"
import { CONTENT_START } from "./home-section"
import { HeroLite, HeroLogoAnchor } from "./hero-lite"
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

// The effect behind the text. At `full` the Swarm is the home page's, on a
// canvas behind the whole page (HomeFull, ADR-0013): the hero keeps the
// square its dust gathers into. `lite` stays until the scene's first frame
// (`covered`), then fades out as the scene fades in, and leaves.
function HeroEffect({ tier, covered }: { tier: MotionTier; covered: boolean }) {
  const [left, setLeft] = useState(false)
  if (tier === "static") return <HeroStatic />
  return (
    <>
      {(tier === "lite" || !left) && (
        <HeroLite
          leaving={tier === "full" && covered}
          onLeft={() => setLeft(true)}
        />
      )}
      {tier === "full" && <HeroLogoAnchor />}
    </>
  )
}

// At `full`, the Swarm's crawl readout (docs/design-brief.md › Главная на
// Swarm › Hero): the scene writes it, and keeps its web out of it. Over the top of the hero, out of the
// flow, so nothing moves when it comes; a readout of the scene, not text.
function HeroReadout() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-zsd-lg"
    >
      <div className="mx-auto max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg md:px-zsd-xxl">
        <p
          dir="ltr"
          data-swarm-readout
          data-swarm-text
          className="w-fit font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted"
        />
      </div>
    </div>
  )
}

// `?motion`: why this device gets the tier it does (MotionTierProvider), in
// a line over the bottom of the hero, out of the flow. For a visitor whose
// device shows no scene to read out or screenshot; nobody else sees it.
function MotionDiagnosis() {
  const { diagnosis } = useMotionTier()
  const [shown] = useState(() =>
    new URLSearchParams(window.location.search).has("motion")
  )
  if (!shown) return null
  return (
    <p
      dir="ltr"
      data-motion-diagnosis
      className="absolute inset-x-0 bottom-zsd-sm px-zsd-lg font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted md:px-zsd-xxl"
    >
      {diagnosis}
    </p>
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
// `covered`: the full layer's scene has drawn, and `lite` gives way to it.
export function Hero({
  tier,
  profile,
  covered,
}: {
  tier: MotionTier
  profile: Promise<HeroProfile | null>
  covered: boolean
}) {
  const lang = useLang()
  const t = useT()
  const { heroRef, tilesRef } = useLogoFlight(tier !== "static")

  return (
    <section
      ref={heroRef}
      data-tier={tier}
      data-swarm-web="hero"
      className={`${tier === "static" ? "" : "logo-flight-hero"} relative isolate flex min-h-(--hero-height) overflow-hidden hero-logo-band`}
    >
      <div aria-hidden="true" dir="ltr" className="absolute inset-0 -z-10">
        <HeroEffect tier={tier} covered={covered} />
      </div>
      {tier === "full" && <HeroReadout />}
      <MotionDiagnosis />
      <div className="mx-auto flex w-full max-w-(--zsd-x-zsd-layout-content-max) flex-col justify-center px-zsd-lg py-zsd-section max-sm:pb-(--hero-logo-band) md:px-zsd-xxl">
        <HeroBrand tiles={tilesRef} />
        <p
          data-swarm-text
          style={delay(SUBTITLE_START)}
          className={`mt-zsd-xl min-h-[3lh] max-w-(--zsd-x-zsd-layout-prose-max) font-zsd-body-lg text-zsd-body-lg text-balance text-zsd-on-surface-muted ${CONTENT_START}`}
        >
          <Suspense>
            <HeroSubtitle profile={profile} />
          </Suspense>
        </p>
        <div
          data-swarm-text
          className={`mt-zsd-lg flex w-fit max-w-full flex-wrap gap-zsd-md ${CONTENT_START}`}
        >
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
