// Head tags of a page under a Lang (CONTEXT.md › Meta Injection). The Worker
// injects them into index.html for crawlers without JS; LangHead renders the
// same ones on the client.
import { DEFAULT_LANG, LANGS, isLang, type Lang } from "./lang"
import { imageUrl } from "./media"
import { MESSAGES, type MessageKey } from "./messages"

export const BRAND = "WebRunner"

// The stage 1 placeholder; pages with their own cover override it.
export const DEFAULT_OG_IMAGE = "/og-default.png"

export type PageMeta = {
  title: string
  description: string
  // A path on the site (`/media/<key>`, `/cdn-cgi/image/…`) or an absolute URL.
  image?: string
  noindex?: boolean
  // The Langs the page has a Translation on, for hreflang; all of them when
  // absent.
  langs?: readonly Lang[]
  // A Post: `og:type=article` and JSON-LD `BlogPosting` (`blogPosting`).
  article?: ArticleMeta
}

export type ArticleMeta = {
  headline: string
  publishedTime: string
  modifiedTime: string
  // The Lang of its text: EN on the Fallback.
  lang: Lang
  // The owner's name from the Profile; none before it is filled in.
  author: string | null
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

// Cloudflare Images width of a cover as `og:image`: what LinkedIn and others
// show at most, and well under their size limits.
const OG_IMAGE_WIDTH = 1200

// A Project's page (`projects/:slug`), titled and described by the Project on
// that Lang (EN as its Fallback), with its cover as the OG image. Null without
// a Case Study: the page is a 404.
export function projectMeta(
  project: {
    title: string
    description: string
    coverKey: string | null
    caseStudy: string | null
  } | null
): PageMeta | null {
  if (project?.caseStudy == null) return null
  return {
    title: withBrand(project.title),
    description: project.description,
    ...(project.coverKey && {
      image: imageUrl(project.coverKey, OG_IMAGE_WIDTH),
    }),
  }
}

// An Album's page (`gallery/:slug`), titled by the Album on that Lang (EN as
// its Fallback), with its cover as the OG image. Null for no Album: the page
// is a 404.
export function albumMeta(
  lang: Lang,
  album: { title: string; cover: { key: string } | null } | null
): PageMeta | null {
  if (!album) return null
  return {
    title: withBrand(album.title),
    description: t(lang, "meta.album").replace("{title}", album.title),
    ...(album.cover && { image: imageUrl(album.cover.key, OG_IMAGE_WIDTH) }),
  }
}

// A Post's page (`blog/:slug`), titled by the Post on that Lang (EN as its
// Fallback) and described by its excerpt, else as the Blog; its cover as the
// OG image, hreflang on the Langs it is translated on. Null for no Post (or a
// draft): the page is a 404.
export function postMeta(
  lang: Lang,
  post: {
    fallback: boolean
    title: string
    excerpt: string
    coverKey: string | null
    publishedAt: string
    updatedAt: string
    langs: readonly Lang[]
  } | null,
  author: string | null
): PageMeta | null {
  if (!post) return null
  return {
    title: withBrand(post.title),
    description: post.excerpt || t(lang, "meta.blog"),
    ...(post.coverKey && { image: imageUrl(post.coverKey, OG_IMAGE_WIDTH) }),
    langs: post.langs,
    article: {
      headline: post.title,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      lang: post.fallback ? DEFAULT_LANG : lang,
      author,
    },
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

// The same page in every Lang it has (all by default), plus `x-default` on
// EN when it is one of them.
export function alternates(
  origin: string,
  path: string,
  langs: readonly Lang[] = LANGS
): { hrefLang: string; href: string }[] {
  const listed = LANGS.filter((lang) => langs.includes(lang))
  return [
    ...listed.map((lang) => ({
      hrefLang: lang,
      href: pageUrl(origin, lang, path),
    })),
    ...(listed.includes(DEFAULT_LANG)
      ? [{ hrefLang: "x-default", href: pageUrl(origin, DEFAULT_LANG, path) }]
      : []),
  ]
}

// schema.org `BlogPosting` of a Post's page, null for any other page. The
// Worker injects it, LangHead renders it again.
export function blogPosting(
  origin: string,
  lang: Lang,
  path: string,
  meta: PageMeta
): Record<string, unknown> | null {
  const { article } = meta
  if (!article) return null
  const url = pageUrl(origin, lang, path)
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.headline,
    description: meta.description,
    image: [new URL(meta.image ?? DEFAULT_OG_IMAGE, origin).href],
    datePublished: article.publishedTime,
    dateModified: article.modifiedTime,
    ...(article.author && {
      author: {
        "@type": "Person",
        name: article.author,
        url: pageUrl(origin, lang, "cv"),
      },
    }),
    inLanguage: article.lang,
    url,
    mainEntityOfPage: url,
  }
}

// JSON for a `<script type="application/ld+json">`: `<` escaped, so no
// `</script>` or `<!--` in the text ends the element.
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c")
}
