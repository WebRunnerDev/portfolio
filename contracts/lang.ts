// Supported Langs (CONTEXT.md). Shared by the frontend and the Worker.
export const LANGS = ["en", "ru", "kk", "es", "de", "ar"] as const

export type Lang = (typeof LANGS)[number]

export const DEFAULT_LANG: Lang = "en"

// Remembers a manual choice from the Lang switcher.
export const LANG_COOKIE = "lang"

export function isLang(value: unknown): value is Lang {
  return LANGS.includes(value as Lang)
}

type LangSources = {
  // Raw `Cookie` header or `document.cookie`.
  cookie?: string | null
  // Raw `Accept-Language` header or `navigator.languages.join(",")`.
  acceptLanguage?: string | null
}

// Lang for `/`: the cookie wins, then Accept-Language, then the fallback.
export function pickLang({ cookie, acceptLanguage }: LangSources): Lang {
  return (
    langFromCookie(cookie) ??
    langFromAcceptLanguage(acceptLanguage) ??
    DEFAULT_LANG
  )
}

export function langFromCookie(cookie?: string | null): Lang | undefined {
  for (const pair of (cookie ?? "").split(";")) {
    const [name, value] = pair.split("=").map((s) => s.trim())
    if (name === LANG_COOKIE && isLang(value)) {
      return value
    }
  }
  return undefined
}

// Best-q match on the primary subtag: `ar-SA` → `ar`, `ru-RU;q=0.9` → `ru`.
export function langFromAcceptLanguage(
  header?: string | null
): Lang | undefined {
  const ranges = (header ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";")
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="))
      return {
        lang: tag.trim().toLowerCase().split("-")[0],
        q: q === undefined ? 1 : Number(q.slice(2)),
        index,
      }
    })
    .filter((r) => r.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)

  return ranges.find((r) => isLang(r.lang))?.lang as Lang | undefined
}

// Swaps the leading Lang segment, keeping the rest of the path:
// `/ru/projects` → `/de/projects`. A path without a Lang gets one prepended
// unless its first segment looks like a language code (`/fr/x` → `/en/x`).
export function withLang(pathname: string, lang: Lang): string {
  const [, first = "", ...rest] = pathname.split("/")
  const tail =
    isLang(first) || /^[a-z]{2}(-[a-z0-9]+)?$/i.test(first)
      ? rest
      : [first, ...rest]
  return ["", lang, ...tail].join("/").replace(/\/$/, "")
}
