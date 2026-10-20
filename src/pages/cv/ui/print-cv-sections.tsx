import type { ReactNode } from "react"

import type {
  Certification,
  Education,
  Experience,
  LanguageSkill,
  Project,
  Technology,
} from "@contracts/api/public"
import { useT } from "@/shared/i18n"
import { fallbackLang } from "@/shared/ui/fallback-notice"

import { CV_LINK } from "./cv-header"
import { CATEGORIES, EXTERNAL, Month, Period } from "./cv-sections"

// The CV Sections of the Print CV: dense, one column, the date at the end of
// the title line, no technology badges. An entry never breaks across pages.

const TITLE = "font-heading font-semibold text-zsd-on-surface"
const MUTED = "text-zsd-on-surface-muted"

function Entry({
  title,
  aside,
  children,
}: {
  title: ReactNode
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <li className="flex break-inside-avoid flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-zsd-md">
        <h3 className={TITLE}>{title}</h3>
        {aside && <div className={`whitespace-nowrap ${MUTED}`}>{aside}</div>}
      </div>
      {children}
    </li>
  )
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul className="list-disc ps-zsd-lg">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

const LIST = "flex flex-col gap-zsd-xs"

export function PrintExperienceList({ items }: { items: Experience[] }) {
  return (
    <ol className={LIST}>
      {items.map((job) => (
        <Entry
          key={job.id}
          title={<span lang={fallbackLang(job)}>{job.role}</span>}
          aside={<Period start={job.startMonth} end={job.endMonth} />}
        >
          <div lang={fallbackLang(job)}>
            <p>
              {job.companyUrl ? (
                <a href={job.companyUrl} {...EXTERNAL} className={CV_LINK}>
                  {job.company}
                </a>
              ) : (
                job.company
              )}
              {job.location && <span className={MUTED}> · {job.location}</span>}
            </p>
            <Bullets items={job.bullets} />
          </div>
        </Entry>
      ))}
    </ol>
  )
}

export function PrintProjectList({ items }: { items: Project[] }) {
  const t = useT()
  return (
    <ul className={LIST}>
      {items.map((project) => (
        <Entry
          key={project.id}
          title={<span lang={fallbackLang(project)}>{project.title}</span>}
          aside={
            (project.githubUrl || project.demoUrl) && (
              <span className="flex gap-x-zsd-md">
                {project.githubUrl && (
                  <a href={project.githubUrl} {...EXTERNAL} className={CV_LINK}>
                    GitHub
                  </a>
                )}
                {project.demoUrl && (
                  <a href={project.demoUrl} {...EXTERNAL} className={CV_LINK}>
                    {t("cv.demo")}
                  </a>
                )}
              </span>
            )
          }
        >
          <div lang={fallbackLang(project)}>
            {project.cvBullets.length > 0 ? (
              <Bullets items={project.cvBullets} />
            ) : (
              <p>{project.description}</p>
            )}
          </div>
        </Entry>
      ))}
    </ul>
  )
}

// One line per group: "Front-End: React, TypeScript".
export function PrintTechnologyGroups({ items }: { items: Technology[] }) {
  const t = useT()
  const groups = new Map<Technology["category"], Technology[]>()
  for (const tech of items) {
    groups.set(tech.category, [...(groups.get(tech.category) ?? []), tech])
  }
  return (
    <ul>
      {[...groups].map(([category, techs]) => (
        <li key={category} className="break-inside-avoid">
          <span className="font-semibold text-zsd-on-surface">
            {t(CATEGORIES[category])}:
          </span>{" "}
          <span dir="ltr">{techs.map((tech) => tech.name).join(", ")}</span>
        </li>
      ))}
    </ul>
  )
}

export function PrintEducationList({ items }: { items: Education[] }) {
  const t = useT()
  return (
    <ol className={LIST}>
      {items.map((study) => (
        <Entry
          key={study.id}
          title={<span lang={fallbackLang(study)}>{study.institution}</span>}
          aside={<Period start={study.startMonth} end={study.endMonth} />}
        >
          <p lang={fallbackLang(study)}>
            {[
              study.degree,
              study.diploma,
              study.gpa && (
                <>
                  {t("cv.gpa")}: <span dir="ltr">{study.gpa}</span>
                </>
              ),
            ]
              .filter(Boolean)
              .map((part, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  {part}
                </span>
              ))}
          </p>
        </Entry>
      ))}
    </ol>
  )
}

export function PrintCertificationList({ items }: { items: Certification[] }) {
  const t = useT()
  return (
    <ul>
      {items.map((cert) => (
        <li
          key={cert.id}
          className="flex break-inside-avoid flex-wrap items-baseline justify-between gap-x-zsd-md"
        >
          <p>
            <span className="font-semibold text-zsd-on-surface">
              {cert.name}
            </span>
            <span className={MUTED}> · {cert.issuer}</span>
            {cert.credentialUrl && (
              <>
                {" · "}
                <a href={cert.credentialUrl} {...EXTERNAL} className={CV_LINK}>
                  {t("cv.credential")}
                </a>
              </>
            )}
          </p>
          {cert.issuedMonth && (
            <span className={`whitespace-nowrap ${MUTED}`}>
              <Month value={cert.issuedMonth} />
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

// All on one line: "Kazakh: Native · Russian: Fluent".
export function PrintLanguageList({ items }: { items: LanguageSkill[] }) {
  return (
    <ul className="flex flex-wrap gap-x-zsd-lg gap-y-zsd-xs">
      {items.map((language) => (
        <li key={language.id} lang={fallbackLang(language)}>
          <span className="font-semibold text-zsd-on-surface">
            {language.name}
          </span>
          <span className={MUTED}>: {language.level}</span>
        </li>
      ))}
    </ul>
  )
}
