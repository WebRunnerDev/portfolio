import type { CvForm } from "@contracts/api/public"
import type { Lang } from "@contracts/lang"
import { cvMeta, printCvMeta } from "@contracts/meta"
import {
  getCertifications,
  getCvSections,
  getEducation,
  getExperience,
  getLanguages,
  getProfile,
  getProjects,
  getTechnologies,
  isNotFound,
} from "@/shared/api"

// Everything the CV is built from, in one round of parallel requests. The
// Profile is null until it has a Translation. `form` picks the CV Sections
// (`show_web` or `show_pdf`) and the meta, which goes to LangHead.
export async function loadCv(
  lang: Lang,
  signal: AbortSignal,
  form: CvForm = "web"
) {
  const options = { signal }
  const [
    profile,
    sections,
    experience,
    projects,
    technologies,
    education,
    certifications,
    languages,
  ] = await Promise.all([
    getProfile(lang, options).catch((error: unknown) => {
      if (isNotFound(error)) return null
      throw error
    }),
    getCvSections(lang, form, options),
    getExperience(lang, options),
    getProjects(lang, options),
    getTechnologies(lang, options),
    getEducation(lang, options),
    getCertifications(lang, options),
    getLanguages(lang, options),
  ])
  return {
    meta: form === "print" ? printCvMeta(lang, profile) : cvMeta(lang, profile),
    profile,
    sections,
    experience,
    projects: projects.filter((project) => project.inCv),
    technologies,
    education,
    certifications,
    languages,
  }
}

export type CvData = Awaited<ReturnType<typeof loadCv>>
