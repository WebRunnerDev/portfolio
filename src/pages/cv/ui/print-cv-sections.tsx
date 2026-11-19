import { Fragment, type ReactNode } from "react"

import type {
  Certification,
  Education,
  Experience,
  LanguageSkill,
  Project,
  Technology,
} from "@contracts/api/public"
import { Month, Period, TECH_CATEGORIES, groupByCategory } from "@/entities/cv"
import { useT } from "@/shared/i18n"
import { fallbackLang } from "@/shared/ui/fallback-notice"

import { EXTERNAL } from "./cv-sections"

// The CV Sections of the Print CV, laid out like a classic one-page résumé:
// a bold title with the date or links at the end of the line, then bullets.
// An entry never breaks across pages.

export const PRINT_LINK = "text-zsd-primary-text no-underline hover:underline"

const BOLD = "font-semibold text-zsd-on-surface"

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
        <h3 className={BOLD}>{title}</h3>
        {aside && <div className="whitespace-nowrap">{aside}</div>}
      </div>
      {children}
    </li>
  )
}

function Bullets({ items }: { items: ReactNode[] }) {
  if (items.length === 0) return null
  return (
    <ul className="list-disc ps-zsd-lg">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

// Items on a line with " | " between them.
function Separated({ items }: { items: ReactNode[] }) {
  return items.map((item, i) => (
    <Fragment key={i}>
      {i > 0 && <span className="px-zsd-sm">|</span>}
      {item}
    </Fragment>
  ))
}

const LIST = "flex flex-col gap-zsd-xs"

export function PrintSummary({ text }: { text: string }) {
  return <p className="text-justify hyphens-auto">{text}</p>
}

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
              <em>
                {job.companyUrl ? (
                  <a href={job.companyUrl} {...EXTERNAL} className={PRINT_LINK}>
                    {job.company}
                  </a>
                ) : (
                  job.company
                )}
              </em>
              {job.location && <> – {job.location}</>}
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
      {items.map((project) => {
        const links = [
          project.githubUrl && (
            <a href={project.githubUrl} {...EXTERNAL} className={PRINT_LINK}>
              GitHub
            </a>
          ),
          project.demoUrl && (
            <a href={project.demoUrl} {...EXTERNAL} className={PRINT_LINK}>
              {t("cv.demo")}
            </a>
          ),
        ].filter(Boolean)
        return (
          <Entry
            key={project.id}
            title={<span lang={fallbackLang(project)}>{project.title}</span>}
            aside={links.length > 0 && <Separated items={links} />}
          >
            <div lang={fallbackLang(project)}>
              {project.cvBullets.length > 0 ? (
                <Bullets items={project.cvBullets} />
              ) : (
                <p>{project.description}</p>
              )}
            </div>
          </Entry>
        )
      })}
    </ul>
  )
}

// One line per group: "Front-End: React, TypeScript".
export function PrintTechnologyGroups({ items }: { items: Technology[] }) {
  const t = useT()
  return (
    <ul>
      {groupByCategory(items).map(([category, techs]) => (
        <li key={category} className="break-inside-avoid">
          <span className={BOLD}>{t(TECH_CATEGORIES[category])}:</span>{" "}
          <span dir="ltr">{techs.map((tech) => tech.name).join(", ")}</span>
        </li>
      ))}
    </ul>
  )
}

// "Degree, Institution" on the title line; the GPA and the diploma below.
export function PrintEducationList({ items }: { items: Education[] }) {
  const t = useT()
  return (
    <ol className={LIST}>
      {items.map((study) => (
        <Entry
          key={study.id}
          title={
            <span lang={fallbackLang(study)}>
              {study.degree}
              <span className="font-normal">, {study.institution}</span>
            </span>
          }
          aside={<Period start={study.startMonth} end={study.endMonth} />}
        >
          <div lang={fallbackLang(study)}>
            <Bullets
              items={[
                study.gpa && (
                  <>
                    {t("cv.gpa")} <span dir="ltr">{study.gpa}</span>
                  </>
                ),
                study.diploma &&
                  t("cv.diplomaWork").replace("{title}", study.diploma),
              ].filter(Boolean)}
            />
          </div>
        </Entry>
      ))}
    </ol>
  )
}

// Two to a line: "AWS Academy Cloud Foundations (Oct 2025) | …", the date
// linking to the credential.
export function PrintCertificationList({ items }: { items: Certification[] }) {
  const lines: Certification[][] = []
  for (let i = 0; i < items.length; i += 2) lines.push(items.slice(i, i + 2))
  return (
    <ul>
      {lines.map((line) => (
        <li key={line[0].id} className="break-inside-avoid">
          <Separated
            items={line.map((cert) => (
              <span key={cert.id}>
                <span className={BOLD}>{cert.name}</span>
                {cert.issuedMonth && (
                  <>
                    {" ("}
                    {cert.credentialUrl ? (
                      <a
                        href={cert.credentialUrl}
                        {...EXTERNAL}
                        className={PRINT_LINK}
                      >
                        <Month value={cert.issuedMonth} />
                      </a>
                    ) : (
                      <Month value={cert.issuedMonth} />
                    )}
                    {")"}
                  </>
                )}
              </span>
            ))}
          />
        </li>
      ))}
    </ul>
  )
}

// All on one line: "Kazakh: Native | Russian: Bilingual (C2)".
export function PrintLanguageList({ items }: { items: LanguageSkill[] }) {
  return (
    <p>
      <Separated
        items={items.map((language) => (
          <span key={language.id} lang={fallbackLang(language)}>
            <span className={BOLD}>{language.name}:</span> {language.level}
          </span>
        ))}
      />
    </p>
  )
}
