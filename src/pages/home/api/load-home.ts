import type { Lang } from "@contracts/lang"
import {
  getAlbums,
  getCvPdf,
  getEducation,
  getExperience,
  getPosts,
  getProfile,
  getProjects,
  getTechnologies,
} from "@/shared/api"

// How much of the CV and the Blog the sections below the hero show
// (docs/design-brief.md › Ритм главной).
const LATEST_JOBS = 3
const LATEST_POSTS = 3

// Nothing is awaited: the hero's brand (the LCP element) renders at once,
// the subtitle and each section fill in when their data arrives. A failed
// request is the same as no data: the Profile and the CV PDF are null, a list
// is empty, and an empty section isn't shown.
export function loadHome(lang: Lang, signal: AbortSignal) {
  const profile = getProfile(lang, { signal }).catch(() => null)
  return {
    profile,
    // The CV in short: the Profile's `about`, the first Experience entries
    // in the CV's order, the Education, the technologies and the CV PDF.
    cv: Promise.all([
      profile,
      getExperience(lang, { signal }).then(
        (jobs) => jobs.slice(0, LATEST_JOBS),
        () => []
      ),
      getEducation(lang, { signal }).catch(() => []),
      getTechnologies(lang, { signal }).catch(() => []),
      getCvPdf(lang, { signal }).catch(() => null),
    ]).then(([profile, experience, education, technologies, pdf]) => ({
      profile,
      experience,
      education,
      technologies,
      pdf,
    })),
    projects: getProjects(lang, { signal }).catch(() => []),
    posts: getPosts(lang, { signal }).then(
      (posts) => posts.slice(0, LATEST_POSTS),
      () => []
    ),
    // Only Albums with photos: the banner counts them and shows their covers.
    albums: getAlbums(lang, { signal }).then(
      (albums) => albums.filter((a) => a.cover),
      () => []
    ),
  }
}

export type HomeCv = Awaited<ReturnType<typeof loadHome>["cv"]>
