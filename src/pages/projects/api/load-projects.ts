import type { Lang } from "@contracts/lang"
import { getProjects } from "@/shared/api"

export function loadProjects(lang: Lang, signal: AbortSignal) {
  return getProjects(lang, { signal })
}
