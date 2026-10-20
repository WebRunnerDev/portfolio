import { getRouteApi } from "@tanstack/react-router"

import type { CvSection } from "@contracts/api/public"
import { useT } from "@/shared/i18n"

import type { CvData } from "../api/load-cv"
import { CvHeader } from "./cv-header"
import { CvPdfLink } from "./cv-pdf-link"
import {
  CertificationList,
  EducationList,
  ExperienceList,
  LanguageList,
  ProjectList,
  SECTION_HEADINGS,
  TechnologyGroups,
} from "./cv-sections"

const route = getRouteApi("/$lang/cv")

function SectionBody({
  type,
  data,
}: {
  type: CvSection["type"]
  data: CvData
}) {
  switch (type) {
    case "experience":
      return <ExperienceList items={data.experience} />
    case "projects":
      return <ProjectList items={data.projects} />
    case "technologies":
      return <TechnologyGroups items={data.technologies} />
    case "education":
      return <EducationList items={data.education} />
    case "certifications":
      return <CertificationList items={data.certifications} />
    case "languages":
      return <LanguageList items={data.languages} />
  }
}

const isEmpty = (type: CvSection["type"], data: CvData) =>
  data[type].length === 0

// The Web CV (CONTEXT.md › CV): the header with the photo, then the CV
// Sections shown on the web, in their order. An empty section is left out.
export function CvPage() {
  const t = useT()
  const data = route.useLoaderData()
  const { profile } = data
  const download = data.pdf && <CvPdfLink pdf={data.pdf} />

  return (
    <div className="mx-auto w-full max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg py-zsd-section md:px-zsd-xxl lg:py-zsd-section-lg">
      {profile ? (
        <CvHeader profile={profile} actions={download} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-zsd-md">
          <h1 className="font-heading text-zsd-headline-md break-words md:text-zsd-headline-lg">
            {t("nav.cv")}
          </h1>
          {download}
        </div>
      )}
      {data.sections
        .filter(({ type }) => !isEmpty(type, data))
        .map(({ type }) => (
          <section
            key={type}
            aria-labelledby={`cv-${type}`}
            data-testid="cv-section"
            className="mt-zsd-section border-t border-zsd-outline-muted pt-zsd-xl lg:mt-zsd-section-lg"
          >
            <h2
              id={`cv-${type}`}
              className="mb-zsd-xl font-heading text-zsd-headline-md text-zsd-on-surface"
            >
              {t(SECTION_HEADINGS[type])}
            </h2>
            <SectionBody type={type} data={data} />
          </section>
        ))}
    </div>
  )
}
