import { use } from "react"

import type { Profile } from "@contracts/api/public"
import { useT } from "@/shared/i18n"
import { fallbackLang } from "@/shared/ui/fallback-notice"
import { Reveal } from "@/shared/ui/reveal"

import { HomeSection } from "./home-section"

// About (docs/design-brief.md › Home rhythm): chamber-sized, the Profile's
// `about` as one `body-lg` paragraph in the prose column, offset from `lg`
// as the hero's subtitle. Leads to the CV. Not shown without an `about`.
export function AboutSection({
  profile,
}: {
  profile: Promise<Profile | null>
}) {
  const t = useT()
  const value = use(profile)
  if (!value?.about) return null

  return (
    <HomeSection
      id="about"
      title={t("home.about.title")}
      link="/$lang/cv"
      linkText={t("home.about.link")}
      className="pt-zsd-section-lg"
    >
      <Reveal
        as="p"
        order={1}
        className="mt-zsd-xl max-w-(--zsd-x-zsd-layout-prose-max) font-zsd-body-lg text-zsd-body-lg whitespace-pre-line text-zsd-on-surface-muted lg:ms-[calc(100%/3)]"
      >
        <span lang={fallbackLang(value)}>{value.about}</span>
      </Reveal>
    </HomeSection>
  )
}
