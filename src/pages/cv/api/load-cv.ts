import type { CvForm } from "@contracts/api/public"
import type { Lang } from "@contracts/lang"
import { cvMeta, printCvMeta } from "@contracts/meta"
import {
  getCertifications,
  getCvPdf,
  getCvSections,
  getEducation,
  getExperience,
  getLanguages,
  getProfile,
  getProjects,
  getTechnologies,
  isNotFound,
} from "@/shared/api"

// Null on a 404: the resource just isn't there yet.
function orNull<T>(request: Promise<T>) {
  return request.catch((error: unknown) => {
    if (isNotFound(error)) return null
    throw error
  })
}

// Everything the CV is built from, in one round of parallel requests. The
// Profile is null until it has a Translation; the CV PDF (web form only) is
// null while neither the Lang nor EN has one. `form` picks the CV Sections
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
    pdf,
  ] = await Promise.all([
    orNull(getProfile(lang, options)),
    getCvSections(lang, form, options),
    getExperience(lang, options),
    getProjects(lang, options),
    getTechnologies(lang, options),
    getEducation(lang, options),
    getCertifications(lang, options),
    getLanguages(lang, options),
    form === "web" ? orNull(getCvPdf(lang, options)) : null,
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
    pdf,
  }
}

export type CvData = Awaited<ReturnType<typeof loadCv>>
