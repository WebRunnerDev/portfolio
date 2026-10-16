import type { Lang } from "@contracts/lang"

import { MESSAGES, type MessageKey } from "@contracts/messages"
import { useLang } from "./use-lang"

export function translate(lang: Lang, key: MessageKey): string {
  return MESSAGES[lang][key]
}

// `const t = useT()` → `t("home.tagline")` in the current Lang.
export function useT() {
  const lang = useLang()
  return (key: MessageKey) => translate(lang, key)
}
