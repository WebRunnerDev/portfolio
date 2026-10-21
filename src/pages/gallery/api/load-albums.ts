import type { Lang } from "@contracts/lang"
import { getAlbums } from "@/shared/api"

export function loadAlbums(lang: Lang, signal: AbortSignal) {
  return getAlbums(lang, { signal })
}
