import { notFound } from "@tanstack/react-router"

import type { Lang } from "@contracts/lang"
import { albumMeta } from "@contracts/meta"
import { getAlbum, isNotFound } from "@/shared/api"

// An unknown slug is a 404. The meta, the same the Worker injects, goes to
// LangHead.
export async function loadAlbum(lang: Lang, slug: string, signal: AbortSignal) {
  const album = await getAlbum(lang, slug, { signal }).catch(
    (error: unknown) => {
      if (isNotFound(error)) throw notFound()
      throw error
    }
  )
  return { meta: albumMeta(lang, album), album }
}
