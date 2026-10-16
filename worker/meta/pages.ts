import type { Lang } from "@contracts/lang"
import { pageMeta, type PageMeta } from "@contracts/meta"

// A page whose meta comes from D1, such as `projects/:slug` (stage 3) or
// `blog/:slug` (stage 5). `pattern` matches the path after the Lang; `meta`
// answers null when there is nothing at that slug, which makes the page a 404.
export type DataPage = {
  pattern: RegExp
  meta: (
    env: Env,
    lang: Lang,
    match: RegExpExecArray
  ) => Promise<PageMeta | null>
}

export const DATA_PAGES: readonly DataPage[] = []

// The meta of a page, or null for a path no page has.
export async function resolveMeta(
  env: Env,
  lang: Lang,
  path: string,
  dataPages: readonly DataPage[] = DATA_PAGES
): Promise<PageMeta | null> {
  const meta = pageMeta(lang, path)
  if (meta) return meta
  for (const page of dataPages) {
    const match = page.pattern.exec(path)
    if (match) return page.meta(env, lang, match)
  }
  return null
}
