import type { Lang } from "@contracts/lang"
import {
  albumMeta,
  cvMeta,
  pageMeta,
  printCvMeta,
  projectMeta,
  type PageMeta,
} from "@contracts/meta"
import { readAlbum } from "../api/routes/public/albums"
import { readProfile } from "../api/routes/public/profile"
import { readProject } from "../api/routes/public/projects"

// A page whose meta comes from D1, such as `cv` or `projects/:slug`.
// `pattern` matches the path after the Lang; `meta` answers null when there
// is nothing at that slug, which makes the page a 404. A data page goes before
// the static meta of the same path.
export type DataPage = {
  pattern: RegExp
  meta: (
    env: Env,
    lang: Lang,
    match: RegExpExecArray
  ) => Promise<PageMeta | null>
}

// The page must not fail with D1: without the Profile it keeps the section
// meta.
async function profileOrNull(env: Env, lang: Lang) {
  try {
    return await readProfile(env.DB, lang)
  } catch (error) {
    console.error("cv meta: no Profile from D1", error)
    return null
  }
}

// `%E0` and the like: no slug, so no page.
function decodeSlug(encoded: string) {
  try {
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

export const DATA_PAGES: readonly DataPage[] = [
  {
    pattern: /^projects\/([^/]+)$/,
    meta: async (env, lang, [, encoded]) => {
      const slug = decodeSlug(encoded)
      if (slug === null) return null
      try {
        return projectMeta(await readProject(env.DB, lang, slug))
      } catch (error) {
        // Not a 404 when D1 fails: the page may well be there.
        console.error("project meta: no Project from D1", error)
        return pageMeta(lang, "projects")
      }
    },
  },
  {
    pattern: /^gallery\/([^/]+)$/,
    meta: async (env, lang, [, encoded]) => {
      const slug = decodeSlug(encoded)
      if (slug === null) return null
      try {
        return albumMeta(lang, await readAlbum(env.DB, lang, slug))
      } catch (error) {
        console.error("album meta: no Album from D1", error)
        return pageMeta(lang, "gallery")
      }
    },
  },
  {
    pattern: /^cv$/,
    meta: async (env, lang) => cvMeta(lang, await profileOrNull(env, lang)),
  },
  {
    pattern: /^cv\/print$/,
    meta: async (env, lang) =>
      printCvMeta(lang, await profileOrNull(env, lang)),
  },
]

// The meta of a page, or null for a path no page has.
export async function resolveMeta(
  env: Env,
  lang: Lang,
  path: string,
  dataPages: readonly DataPage[] = DATA_PAGES
): Promise<PageMeta | null> {
  for (const page of dataPages) {
    const match = page.pattern.exec(path)
    if (match) return page.meta(env, lang, match)
  }
  return pageMeta(lang, path)
}
