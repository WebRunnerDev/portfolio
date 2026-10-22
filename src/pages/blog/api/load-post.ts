import { notFound } from "@tanstack/react-router"

import type { Lang } from "@contracts/lang"
import { postMeta } from "@contracts/meta"
import { getPost, isNotFound } from "@/shared/api"

// An unknown slug and a draft (the API answers both with 404) are a 404. The
// meta goes to LangHead.
export async function loadPost(lang: Lang, slug: string, signal: AbortSignal) {
  const post = await getPost(lang, slug, { signal }).catch((error: unknown) => {
    if (isNotFound(error)) throw notFound()
    throw error
  })
  return { meta: postMeta(lang, post), post }
}
