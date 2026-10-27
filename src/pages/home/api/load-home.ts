import type { Lang } from "@contracts/lang"
import { getProfile } from "@/shared/api"

// The Profile isn't awaited: the hero's brand (the LCP element) renders at
// once, and the subtitle fills in when it arrives. Null when it fails or
// has no Translation yet.
export function loadHome(lang: Lang, signal: AbortSignal) {
  return {
    profile: getProfile(lang, { signal }).catch(() => null),
  }
}
