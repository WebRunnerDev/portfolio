import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import type {
  Certification,
  CvSection,
  Education,
  Experience,
  LanguageSkill,
  Project,
  Technology,
} from "@contracts/api/public"
import { useLang, useT, type MessageKey } from "@/shared/i18n"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"

import { formatMonth } from "../lib/format-month"
import { CV_LINK } from "./cv-header"

export const SECTION_HEADINGS: Record<CvSection["type"], MessageKey> = {
  experience: "cv.experience",
  projects: "cv.projects",
  technologies: "cv.technologies",
  education: "cv.education",
  certifications: "cv.certifications",
  languages: "cv.languages",
}

export const CATEGORIES: Record<Technology["category"], MessageKey> = {
  frontend: "cv.tech.frontend",
  backend_cloud: "cv.tech.backend_cloud",
  qa_testing: "cv.tech.qa_testing",
  tools_design: "cv.tech.tools_design",
}

const MONO = "font-zsd-label-mono text-zsd-label-mono uppercase rtl:normal-case"
const TITLE = "font-heading text-zsd-headline-sm text-zsd-on-surface"
export const EXTERNAL = { target: "_blank", rel: "noreferrer" } as const

// From `md` the date column stands beside each entry (DESIGN.md › Responsive
// behavior); entries without a date start in the second column.
function Entry({
  aside,
  children,
}: {
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <li className="grid gap-zsd-xs md:grid-cols-[10rem_minmax(0,1fr)] md:gap-x-zsd-xl">
      {aside && (
        <div className={`${MONO} text-zsd-on-surface-muted md:pt-1`}>
          {aside}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-zsd-sm md:col-start-2">
        {children}
      </div>
    </li>
  )
}

export function Month({ value }: { value: string }) {
  const lang = useLang()
  return <time dateTime={value}>{formatMonth(value, lang)}</time>
}

// `end` null is "present".
export function Period({ start, end }: { start: string; end: string | null }) {
  const t = useT()
  return (
    <p>
      <Month value={start} /> – {end ? <Month value={end} /> : t("cv.present")}
    </p>
  )
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul className="flex list-disc flex-col gap-zsd-xs ps-zsd-lg text-zsd-body-md text-zsd-on-surface-muted">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function TechBadges({ items }: { items: Technology[] }) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-zsd-xs">
      {items.map((tech) => (
        <li
          key={tech.id}
          className={`${MONO} border border-zsd-outline-muted px-zsd-sm py-zsd-xs text-zsd-on-surface-muted`}
        >
          {tech.name}
        </li>
      ))}
    </ul>
  )
}

// An entity's own text, marked English when it came as a Fallback.
function Translated({
  entity,
  children,
}: {
  entity: { fallback: boolean }
  children: ReactNode
}) {
  return (
    <>
      <FallbackNotice fallback={entity.fallback} />
      <div lang={fallbackLang(entity)} className="flex flex-col gap-zsd-sm">
        {children}
      </div>
    </>
  )
}

export function ExperienceList({ items }: { items: Experience[] }) {
  return (
    <ol className="flex flex-col gap-zsd-xl">
      {items.map((job) => (
        <Entry
          key={job.id}
          aside={<Period start={job.startMonth} end={job.endMonth} />}
        >
          <Translated entity={job}>
            <div>
              <h3 className={TITLE}>{job.role}</h3>
              <p className="text-zsd-body-md text-zsd-on-surface">
                {job.companyUrl ? (
                  <a href={job.companyUrl} {...EXTERNAL} className={CV_LINK}>
                    {job.company}
                  </a>
                ) : (
                  job.company
                )}
                {job.location && (
                  <span className="text-zsd-on-surface-muted">
                    {" · "}
                    {job.location}
                  </span>
                )}
              </p>
            </div>
            <Bullets items={job.bullets} />
          </Translated>
          <TechBadges items={job.technologies} />
        </Entry>
      ))}
    </ol>
  )
}

export function ProjectList({ items }: { items: Project[] }) {
  const lang = useLang()
  const t = useT()
  return (
    <ul className="flex flex-col gap-zsd-xl">
      {items.map((project) => (
        <Entry key={project.id}>
          <Translated entity={project}>
            <h3 className={TITLE}>
              {project.hasCaseStudy ? (
                <Link
                  to="/$lang/projects/$slug"
                  params={{ lang, slug: project.slug }}
                  className={CV_LINK}
                >
                  {project.title}
                </Link>
              ) : (
                project.title
              )}
            </h3>
            {project.cvBullets.length > 0 ? (
              <Bullets items={project.cvBullets} />
            ) : (
              <p className="text-zsd-body-md text-zsd-on-surface-muted">
                {project.description}
              </p>
            )}
          </Translated>
          {(project.githubUrl || project.demoUrl) && (
            <p className="flex flex-wrap gap-x-zsd-lg text-zsd-body-sm">
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
            </p>
          )}
          <TechBadges items={project.technologies} />
        </Entry>
      ))}
    </ul>
  )
}

// The directory by group, groups and technologies in the API's order.
export function TechnologyGroups({ items }: { items: Technology[] }) {
  const t = useT()
  const groups = new Map<Technology["category"], Technology[]>()
  for (const tech of items) {
    groups.set(tech.category, [...(groups.get(tech.category) ?? []), tech])
  }
  return (
    <ul className="flex flex-col gap-zsd-lg">
      {[...groups].map(([category, techs]) => (
        <Entry key={category} aside={<h3>{t(CATEGORIES[category])}</h3>}>
          <TechBadges items={techs} />
        </Entry>
      ))}
    </ul>
  )
}

export function EducationList({ items }: { items: Education[] }) {
  const t = useT()
  return (
    <ol className="flex flex-col gap-zsd-xl">
      {items.map((study) => (
        <Entry
          key={study.id}
          aside={<Period start={study.startMonth} end={study.endMonth} />}
        >
          <Translated entity={study}>
            <div>
              <h3 className={TITLE}>{study.institution}</h3>
              <p className="text-zsd-body-md text-zsd-on-surface">
                {study.degree}
              </p>
            </div>
            {(study.diploma || study.gpa) && (
              <p className="text-zsd-body-sm text-zsd-on-surface-muted">
                {study.diploma}
                {study.diploma && study.gpa && " · "}
                {study.gpa && (
                  <>
                    {t("cv.gpa")}: <span dir="ltr">{study.gpa}</span>
                  </>
                )}
              </p>
            )}
          </Translated>
        </Entry>
      ))}
    </ol>
  )
}

export function CertificationList({ items }: { items: Certification[] }) {
  const t = useT()
  return (
    <ul className="flex flex-col gap-zsd-lg">
      {items.map((cert) => (
        <Entry
          key={cert.id}
          aside={cert.issuedMonth && <Month value={cert.issuedMonth} />}
        >
          <h3 className={TITLE}>{cert.name}</h3>
          <p className="text-zsd-body-md text-zsd-on-surface-muted">
            {cert.issuer}
            {cert.credentialUrl && (
              <>
                {" · "}
                <a href={cert.credentialUrl} {...EXTERNAL} className={CV_LINK}>
                  {t("cv.credential")}
                </a>
              </>
            )}
          </p>
        </Entry>
      ))}
    </ul>
  )
}

export function LanguageList({ items }: { items: LanguageSkill[] }) {
  return (
    <ul className="flex flex-col gap-zsd-md">
      {items.map((language) => (
        <Entry key={language.id}>
          <Translated entity={language}>
            <p className="text-zsd-body-md text-zsd-on-surface">
              <span className="font-semibold">{language.name}</span>
              <span className="text-zsd-on-surface-muted">
                {" · "}
                {language.level}
              </span>
            </p>
          </Translated>
        </Entry>
      ))}
    </ul>
  )
}
