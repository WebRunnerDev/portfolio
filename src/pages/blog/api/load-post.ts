import { notFound } from "@tanstack/react-router"

import type { Lang } from "@contracts/lang"
import { postMeta } from "@contracts/meta"
import { getPost, getProfile, isNotFound } from "@/shared/api"

// An unknown slug and a draft (the API answers both with 404) are a 404. The
// meta goes to LangHead; the Profile only names the author in it, so the page
// does without it.
export async function loadPost(lang: Lang, slug: string, signal: AbortSignal) {
  const [post, profile] = await Promise.all([
    getPost(lang, slug, { signal }).catch((error: unknown) => {
      if (isNotFound(error)) throw notFound()
      throw error
    }),
    getProfile(lang, { signal }).catch(() => null),
  ])
  return { meta: postMeta(lang, post, profile?.name ?? null), post }
}
