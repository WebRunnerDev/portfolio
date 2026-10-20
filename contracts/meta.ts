// Head tags of a page under a Lang (CONTEXT.md › Meta Injection). The Worker
// injects them into index.html for crawlers without JS; LangHead renders the
// same ones on the client.
import { DEFAULT_LANG, LANGS, isLang, type Lang } from "./lang"
import { MESSAGES, type MessageKey } from "./messages"

export const BRAND = "WebRunner"

// The stage 1 placeholder; pages with their own cover override it.
export const DEFAULT_OG_IMAGE = "/og-default.png"

export type PageMeta = {
  title: string
  description: string
  // A path on the site (`/media/<key>`) or an absolute URL.
  image?: string
  noindex?: boolean
}

// `og:locale` wants language_TERRITORY.
export const OG_LOCALES: Record<Lang, string> = {
  en: "en_US",
  ru: "ru_RU",
  kk: "kk_KZ",
  es: "es_ES",
  de: "de_DE",
  ar: "ar_AR",
}

const t = (lang: Lang, key: MessageKey) => MESSAGES[lang][key]

const withBrand = (title: string) => `${title} · ${BRAND}`

function section(path: string, title: MessageKey, description: MessageKey) {
  return {
    path,
    meta: (lang: Lang): PageMeta => ({
      title: path ? withBrand(t(lang, title)) : BRAND,
      description: t(lang, description),
    }),
  }
}

// Pages without data of their own, by the path after the Lang. Pages whose
// meta comes from D1 are added in worker/meta/pages.ts.
const PAGES: readonly { path: string; meta: (lang: Lang) => PageMeta }[] = [
  section("", "nav.home", "meta.home"),
  section("cv", "nav.cv", "meta.cv"),
  section("projects", "nav.projects", "meta.projects"),
  section("gallery", "nav.gallery", "meta.gallery"),
  section("blog", "nav.blog", "meta.blog"),
  {
    path: "design",
    meta: (lang) => ({
      title: withBrand("Design system"),
      description: t(lang, "meta.home"),
      noindex: true,
    }),
  },
]

export const PAGE_PATHS = PAGES.map((page) => page.path)

export function pageMeta(lang: Lang, path: string): PageMeta | null {
  return PAGES.find((page) => page.path === path)?.meta(lang) ?? null
}

// The CV is titled with the owner's name and headline from the Profile on
// that Lang; without a Profile it keeps the section meta.
export function cvMeta(
  lang: Lang,
  profile: { name: string; headline: string } | null
): PageMeta {
  const meta = pageMeta(lang, "cv")!
  if (!profile) return meta
  return {
    title: withBrand(`${profile.name}: ${t(lang, "nav.cv")}`),
    description: `${profile.headline}. ${meta.description}`,
  }
}

// The Print CV (`cv/print`) is the source of the CV PDF, not a page to find.
export function printCvMeta(
  lang: Lang,
  profile: { name: string; headline: string } | null
): PageMeta {
  return { ...cvMeta(lang, profile), noindex: true }
}

export function notFoundMeta(lang: Lang): PageMeta {
  return {
    title: withBrand(t(lang, "notFound.title")),
    description: t(lang, "notFound.text"),
    noindex: true,
  }
}

// `/ru/cv/` → `{ lang: "ru", path: "cv" }`; null when the path has no Lang.
export function parsePagePath(
  pathname: string
): { lang: Lang; path: string } | null {
  const [, lang, ...rest] = pathname.split("/")
  if (!isLang(lang)) return null
  return { lang, path: rest.filter(Boolean).join("/") }
}

export function pageUrl(origin: string, lang: Lang, path: string): string {
  return `${origin}/${lang}${path ? `/${path}` : ""}`
}

// The same page in every Lang, plus `x-default` on EN.
export function alternates(
  origin: string,
  path: string
): { hrefLang: string; href: string }[] {
  return [
    ...LANGS.map((lang) => ({
      hrefLang: lang,
      href: pageUrl(origin, lang, path),
    })),
    { hrefLang: "x-default", href: pageUrl(origin, DEFAULT_LANG, path) },
  ]
}
