import { getRouteApi } from "@tanstack/react-router"

import type { CvSection } from "@contracts/api/public"
import { useT, type MessageKey } from "@/shared/i18n"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"
import { PageStub } from "@/shared/ui/page-stub"

import type { CvData } from "../api/load-cv"

const route = getRouteApi("/$lang/cv")

type Item = {
  id: number
  primary: string
  secondary?: string | null
  fallback: boolean
}

const HEADINGS: Record<CvSection["type"], MessageKey> = {
  experience: "cv.experience",
  projects: "cv.projects",
  technologies: "cv.technologies",
  education: "cv.education",
  certifications: "cv.certifications",
  languages: "cv.languages",
}

function sectionItems(type: CvSection["type"], data: CvData): Item[] {
  switch (type) {
    case "experience":
      return data.experience.map((e) => ({
        ...e,
        primary: e.role,
        secondary: e.company,
      }))
    case "projects":
      return data.projects.map((p) => ({
        ...p,
        primary: p.title,
        secondary: p.description,
      }))
    case "technologies":
      return data.technologies.map((t) => ({
        ...t,
        primary: t.name,
        fallback: false,
      }))
    case "education":
      return data.education.map((e) => ({
        ...e,
        primary: e.institution,
        secondary: e.degree,
      }))
    case "certifications":
      return data.certifications.map((c) => ({
        ...c,
        fallback: false,
        primary: c.name,
        secondary: c.issuer,
      }))
    case "languages":
      return data.languages.map((l) => ({
        ...l,
        primary: l.name,
        secondary: l.level,
      }))
  }
}

// The CV data as plain lists; the Web CV design lands with #66.
export function CvPage() {
  const t = useT()
  const data = route.useLoaderData()
  const { profile } = data

  return (
    <PageStub title={t("nav.cv")}>
      {profile && (
        <div className="flex flex-col gap-zsd-xs">
          <FallbackNotice fallback={profile.fallback} />
          <div lang={fallbackLang(profile)}>
            <p className="font-heading text-zsd-headline-sm text-zsd-on-surface">
              {profile.name}
            </p>
            <p>{profile.headline}</p>
          </div>
        </div>
      )}
      {data.sections.map(({ type }) => (
        <section key={type} className="mt-zsd-xl">
          <h2 className="font-heading text-zsd-headline-sm text-zsd-on-surface">
            {t(HEADINGS[type])}
          </h2>
          <ul className="mt-zsd-sm flex flex-col gap-zsd-md">
            {sectionItems(type, data).map((item) => (
              <li key={item.id}>
                <FallbackNotice fallback={item.fallback} />
                <div lang={fallbackLang(item)}>
                  <p className="text-zsd-on-surface">{item.primary}</p>
                  {item.secondary && <p>{item.secondary}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PageStub>
  )
}
