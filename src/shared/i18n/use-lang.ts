import { useParams } from "@tanstack/react-router"

import { DEFAULT_LANG, isLang, type Lang } from "@contracts/lang"

// Lang from the first URL segment; the `/$lang` route rejects unknown ones.
export function useLang(): Lang {
  const { lang } = useParams({ strict: false })
  return isLang(lang) ? lang : DEFAULT_LANG
}
