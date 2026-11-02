import { use } from "react"

import {
  CvPdfLink,
  Period,
  TECH_CATEGORIES,
  groupByCategory,
} from "@/entities/cv"
import { ProjectTechnologies } from "@/entities/project"
import { useT } from "@/shared/i18n"
import { fallbackLang } from "@/shared/ui/fallback-notice"
import { Reveal } from "@/shared/ui/reveal"

import type { HomeCv } from "../api/load-home"
import { HomeSection } from "./home-section"

const LABEL =
  "font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase rtl:normal-case"

type Entry = {
  id: number
  fallback: boolean
  startMonth: string
  endMonth: string | null
  title: string
  subtitle: string
}

// A titled list of CV entries: the period, the title, the subtitle.
function EntryList({
  id,
  heading,
  entries,
}: {
  id: string
  heading: string
  entries: Entry[]
}) {
  return (
    <div>
      <h3 className={LABEL}>{heading}</h3>
      <ol
        data-testid={`home-cv-${id}`}
        className="mt-zsd-md border-b border-zsd-outline-muted"
      >
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-col gap-zsd-xs border-t border-zsd-outline-muted py-zsd-md"
          >
            <div className={LABEL}>
              <Period start={entry.startMonth} end={entry.endMonth} />
            </div>
            <p
              lang={fallbackLang(entry)}
              className="font-heading text-zsd-headline-sm break-words text-zsd-on-surface"
            >
              {entry.title}
            </p>
            <p
              lang={fallbackLang(entry)}
              className="text-zsd-body-md text-zsd-on-surface-muted"
            >
              {entry.subtitle}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

// The CV in short (docs/design-brief.md › Ритм главной): chamber-sized, the
// Profile's `about` as one `body-lg` paragraph in the prose column, on the
// line of the hero's subtitle (HomeSection); under it the latest Experience (period,
// role, company) over the Education (period, institution, degree), and the
// technologies by category beside them from `lg`. Leads to the CV, with the
// CV PDF beside the link. Not shown while it has none of these.
export function CvSection({ cv }: { cv: Promise<HomeCv> }) {
  const t = useT()
  const { profile, experience, education, technologies, pdf } = use(cv)
  const about = profile?.about
  const history = experience.length > 0 || education.length > 0
  if (!about && !history && technologies.length === 0) return null

  return (
    <HomeSection
      id="cv"
      title={t("nav.cv")}
      link="/$lang/cv"
      linkText={t("home.cv.link")}
      actions={pdf && <CvPdfLink pdf={pdf} />}
      className="pt-zsd-section-lg"
    >
      {about && (
        <Reveal
          as="p"
          order={1}
          className="mt-zsd-xl max-w-(--zsd-x-zsd-layout-prose-max) font-zsd-body-lg text-zsd-body-lg whitespace-pre-line text-zsd-on-surface-muted"
        >
          <span lang={fallbackLang(profile)}>{about}</span>
        </Reveal>
      )}
      {(history || technologies.length > 0) && (
        <div className="mt-zsd-section grid gap-zsd-section lg:grid-cols-2 lg:gap-zsd-xxl">
          {history && (
            <Reveal order={2} className="flex flex-col gap-zsd-xxl">
              {experience.length > 0 && (
                <EntryList
                  id="experience"
                  heading={t("cv.experience")}
                  entries={experience.map((job) => ({
                    ...job,
                    title: job.role,
                    subtitle: job.company,
                  }))}
                />
              )}
              {education.length > 0 && (
                <EntryList
                  id="education"
                  heading={t("cv.education")}
                  entries={education.map((study) => ({
                    ...study,
                    title: study.institution,
                    subtitle: study.degree,
                  }))}
                />
              )}
            </Reveal>
          )}
          {technologies.length > 0 && (
            <Reveal order={3}>
              <h3 className={LABEL}>{t("cv.technologies")}</h3>
              <ul
                data-testid="home-cv-technologies"
                className="mt-zsd-md flex flex-col gap-zsd-lg border-t border-zsd-outline-muted pt-zsd-md"
              >
                {groupByCategory(technologies).map(([category, techs]) => (
                  <li key={category} className="flex flex-col gap-zsd-sm">
                    <p className="text-zsd-body-sm text-zsd-on-surface">
                      {t(TECH_CATEGORIES[category])}
                    </p>
                    <ProjectTechnologies technologies={techs} />
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>
      )}
    </HomeSection>
  )
}
