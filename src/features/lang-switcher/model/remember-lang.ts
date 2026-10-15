import { LANG_COOKIE, type Lang } from "@contracts/lang"

const ONE_YEAR = 60 * 60 * 24 * 365

// Read back by `pickLang` when someone opens `/`.
export function rememberLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${ONE_YEAR}; samesite=lax`
}
