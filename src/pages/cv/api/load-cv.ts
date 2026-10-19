import type { Lang } from "@contracts/lang"
import { cvMeta } from "@contracts/meta"
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
// Profile is null until it has a Translation. `meta` goes to LangHead.
export async function loadCv(lang: Lang, signal: AbortSignal) {
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
    getCvSections(lang, options),
    getExperience(lang, options),
    getProjects(lang, options),
    getTechnologies(lang, options),
    getEducation(lang, options),
    getCertifications(lang, options),
    getLanguages(lang, options),
  ])
  return {
    meta: cvMeta(lang, profile),
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
