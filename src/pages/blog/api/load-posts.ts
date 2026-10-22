import type { Lang } from "@contracts/lang"
import { getPosts } from "@/shared/api"

export function loadPosts(
  lang: Lang,
  tag: string | undefined,
  signal: AbortSignal
) {
  return getPosts(lang, { tag, signal })
}
