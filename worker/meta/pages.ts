import type { Lang } from "@contracts/lang"
import { cvMeta, pageMeta, type PageMeta } from "@contracts/meta"
import { readProfile } from "../api/routes/public/profile"

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

export const DATA_PAGES: readonly DataPage[] = [
  {
    pattern: /^cv$/,
    meta: async (env, lang) => cvMeta(lang, await readProfile(env.DB, lang)),
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
