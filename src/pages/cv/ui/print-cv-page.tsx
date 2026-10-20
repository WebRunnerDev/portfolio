import { getRouteApi } from "@tanstack/react-router"

import type { CvSection } from "@contracts/api/public"
import { useT } from "@/shared/i18n"

import type { CvData } from "../api/load-cv"
import { usePrintReady } from "../lib/use-print-ready"
import { CvHeader } from "./cv-header"
import { SECTION_HEADINGS } from "./cv-sections"
import {
  PrintCertificationList,
  PrintEducationList,
  PrintExperienceList,
  PrintLanguageList,
  PrintProjectList,
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

// The Print CV (CONTEXT.md › CV), the source of the CV PDF (ADR-0003): the
// CV header without the photo, then the CV Sections shown in the PDF, on one
// A4 page (`print-sheet` in index.css). No site layout, always light.
export function PrintCvPage() {
  const t = useT()
  const data = route.useLoaderData()
  const { profile } = data
  usePrintReady()

  return (
    <main className="mx-auto flex print-sheet flex-col gap-zsd-sm bg-zsd-surface text-zsd-body-sm/tight text-zsd-on-surface-muted">
      {profile ? (
        <CvHeader profile={profile} form="print" />
      ) : (
        <h1 className="font-heading text-zsd-headline-md text-zsd-on-surface">
          {t("nav.cv")}
        </h1>
      )}
      {data.sections
        .filter(({ type }) => data[type].length > 0)
        .map(({ type }) => (
          <section
            key={type}
            aria-labelledby={`cv-${type}`}
            data-testid="cv-section"
            className="flex flex-col gap-zsd-xs"
          >
            <h2
              id={`cv-${type}`}
              className="break-after-avoid border-b border-zsd-outline-muted font-heading text-zsd-body-lg/tight text-zsd-on-surface"
            >
              {t(SECTION_HEADINGS[type])}
            </h2>
            <SectionBody type={type} data={data} />
          </section>
        ))}
    </main>
  )
}
