import type { Lang } from "@contracts/lang"

import { MESSAGES, type MessageKey } from "@contracts/messages"
import { formatNumber, intlLocale } from "./format"
import { useLang } from "./use-lang"

export function translate(lang: Lang, key: MessageKey): string {
  return MESSAGES[lang][key]
}

// `const t = useT()` → `t("home.tagline")` in the current Lang.
export function useT() {
  const lang = useLang()
  return (key: MessageKey) => translate(lang, key)
}

// A message with a key per plural category: `album.photos.one`,
// `album.photos.few`… Every dictionary has all six, so any Lang's rules find
// theirs.
type PluralBase<K> = K extends `${infer Base}.other` ? Base : never

export type PluralKey = PluralBase<MessageKey>

// The message for `count` in the Lang's plural category, with `{count}`
// replaced by the formatted number.
export function translatePlural(lang: Lang, key: PluralKey, count: number) {
  const rule = new Intl.PluralRules(intlLocale(lang)).select(count)
  return translate(lang, `${key}.${rule}`).replace(
    "{count}",
    formatNumber(count, lang)
  )
}

// `const tp = useTPlural()` → `tp("album.photos", 3)` in the current Lang.
export function useTPlural() {
  const lang = useLang()
  return (key: PluralKey, count: number) => translatePlural(lang, key, count)
}
