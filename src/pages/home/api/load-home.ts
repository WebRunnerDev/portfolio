import type { Lang } from "@contracts/lang"
import { getAlbums, getPosts, getProfile, getProjects } from "@/shared/api"

// How many of each the sections below the hero show
// (docs/design-brief.md › Home rhythm).
const FEATURED = 3
const LATEST_POSTS = 3

// Nothing is awaited: the hero's brand (the LCP element) renders at once,
// the subtitle and each section fill in when their data arrives. A failed
// request is the same as no data: the Profile is null, a list is empty, and
// an empty section isn't shown.
export function loadHome(lang: Lang, signal: AbortSignal) {
  return {
    profile: getProfile(lang, { signal }).catch(() => null),
    projects: getProjects(lang, { signal }).then(
      (projects) => projects.filter((p) => p.featured).slice(0, FEATURED),
      () => []
    ),
    posts: getPosts(lang, { signal }).then(
      (posts) => posts.slice(0, LATEST_POSTS),
      () => []
    ),
    // Only Albums with photos: the section is a strip of covers.
    albums: getAlbums(lang, { signal }).then(
      (albums) => albums.filter((a) => a.cover),
      () => []
    ),
  }
}
