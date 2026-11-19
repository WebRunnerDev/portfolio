import type { ReactNode } from "react"
import { getRouteApi } from "@tanstack/react-router"

import type { CvSection } from "@contracts/api/public"
import { useT } from "@/shared/i18n"
import { fallbackLang } from "@/shared/ui/fallback-notice"

import type { CvData } from "../api/load-cv"
import { usePrintReady } from "../lib/use-print-ready"
import { PrintCvHeader } from "./print-cv-header"
import { SECTION_HEADINGS } from "./cv-sections"
import {
  PrintCertificationList,
  PrintEducationList,
  PrintExperienceList,
  PrintLanguageList,
  PrintProjectList,
  PrintSummary,
  PrintTechnologyGroups,
} from "./print-cv-sections"

const route = getRouteApi("/$lang_/cv/print")

function SectionBody({
  type,
  data,
}: {
  type: CvSection["type"]
  data: CvData
}) {
  switch (type) {
    case "experience":
      return <PrintExperienceList items={data.experience} />
    case "projects":
      return <PrintProjectList items={data.projects} />
    case "technologies":
      return <PrintTechnologyGroups items={data.technologies} />
    case "education":
      return <PrintEducationList items={data.education} />
    case "certifications":
      return <PrintCertificationList items={data.certifications} />
    case "languages":
      return <PrintLanguageList items={data.languages} />
  }
}

function Section({
  id,
  heading,
  children,
}: {
  id: string
  heading: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      data-testid="cv-section"
      className="flex flex-col gap-zsd-xs"
    >
      <h2
        id={id}
        className="break-after-avoid border-b border-zsd-on-surface font-heading text-zsd-body-lg/tight font-semibold text-zsd-on-surface"
      >
        {heading}
      </h2>
      {children}
    </section>
  )
}

// The Print CV (CONTEXT.md › CV), the source of the CV PDF (ADR-0003): the
// centred header, the Summary (the Profile's `about`), then the CV Sections
// shown in the PDF, on one
// A4 page (`print-sheet` in index.css). No site layout, always light.
export function PrintCvPage() {
  const t = useT()
  const data = route.useLoaderData()
  const { profile } = data
  usePrintReady()

  return (
    <main className="mx-auto flex print-sheet flex-col gap-zsd-sm bg-zsd-surface text-zsd-body-sm/snug text-zsd-on-surface">
      {profile ? (
        <PrintCvHeader profile={profile} />
      ) : (
        <h1 className="font-heading text-zsd-headline-md text-zsd-on-surface">
          {t("nav.cv")}
        </h1>
      )}
      {profile?.about && (
        <Section id="cv-summary" heading={t("cv.summary")}>
          <div lang={fallbackLang(profile)}>
            <PrintSummary text={profile.about} />
          </div>
        </Section>
      )}
      {data.sections
        .filter(({ type }) => data[type].length > 0)
        .map(({ type }) => (
          <Section
            key={type}
            id={`cv-${type}`}
            heading={t(SECTION_HEADINGS[type])}
          >
            <SectionBody type={type} data={data} />
          </Section>
        ))}
    </main>
  )
}
