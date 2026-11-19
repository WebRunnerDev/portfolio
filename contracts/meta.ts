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
  // The CV: JSON-LD `ProfilePage` about the owner (`profilePage`).
  person?: PersonMeta
}

// The owner as schema.org `Person`, from the Profile on the page's Lang.
export type PersonMeta = {
  name: string
  jobTitle: string
  // A key in the MEDIA bucket.
  photoKey: string | null
  // The owner's profiles elsewhere (GitHub, LinkedIn, Telegram).
  sameAs: string[]
}

// The parts of a Profile (`contracts/api/public.ts`) a page's meta reads.
export type ProfileMeta = {
  name: string
  headline: string
  photoKey?: string | null
  githubUrl?: string | null
  linkedinUrl?: string | null
  telegramUrl?: string | null
}

export function personMeta(profile: ProfileMeta): PersonMeta {
  return {
    name: profile.name,
    jobTitle: profile.headline,
    photoKey: profile.photoKey ?? null,
    sameAs: [
      profile.githubUrl,
      profile.linkedinUrl,
      profile.telegramUrl,
    ].filter((url): url is string => !!url),
  }
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
// that Lang and carries the owner as a `Person`; without a Profile it keeps
// the section meta.
export function cvMeta(lang: Lang, profile: ProfileMeta | null): PageMeta {
  const meta = pageMeta(lang, "cv")!
  if (!profile) return meta
  return {
    title: withBrand(`${profile.name}: ${t(lang, "nav.cv")}`),
    description: `${profile.headline}. ${meta.description}`,
    person: personMeta(profile),
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
    // Markdown on the Worker, its tree on the page: only its presence counts.
    caseStudy: unknown
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
export function printCvMeta(lang: Lang, profile: ProfileMeta | null): PageMeta {
  return { ...cvMeta(lang, profile), person: undefined, noindex: true }
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

// The Blog's RSS feed on a Lang (worker/README.md › RSS).
export function feedPath(lang: Lang): string {
  return `/${lang}/rss.xml`
}

// The feed the Blog's pages (`blog`, `blog/:slug`) announce with
// `<link rel="alternate" type="application/rss+xml">`; null on any other page.
export function blogFeed(
  lang: Lang,
  path: string
): { title: string; path: string } | null {
  if (path !== "blog" && !/^blog\/[^/]+$/.test(path)) return null
  return { title: pageMeta(lang, "blog")!.title, path: feedPath(lang) }
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

// schema.org `Person` of the owner, the same on the home page and the CV
// (one `@id`), so search sees one entity. Its `url` is the home page.
export function person(
  origin: string,
  lang: Lang,
  meta: PersonMeta
): Record<string, unknown> {
  return {
    "@type": "Person",
    "@id": `${origin}/#person`,
    name: meta.name,
    jobTitle: meta.jobTitle,
    url: pageUrl(origin, lang, ""),
    ...(meta.photoKey && {
      image: new URL(imageUrl(meta.photoKey, OG_IMAGE_WIDTH), origin).href,
    }),
    ...(meta.sameAs.length > 0 && { sameAs: meta.sameAs }),
  }
}

// The home page's JSON-LD: the owner as a `Person`. Rendered on the client
// only, once the Profile arrives (worker/README.md › JSON-LD).
export function homePerson(
  origin: string,
  lang: Lang,
  meta: PersonMeta
): Record<string, unknown> {
  return { "@context": "https://schema.org", ...person(origin, lang, meta) }
}

// schema.org `ProfilePage` of the CV, about the owner; null for any other
// page. The Worker injects it, LangHead renders it again.
export function profilePage(
  origin: string,
  lang: Lang,
  path: string,
  meta: PageMeta
): Record<string, unknown> | null {
  if (!meta.person) return null
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: pageUrl(origin, lang, path),
    mainEntity: person(origin, lang, meta.person),
  }
}

// JSON for a `<script type="application/ld+json">`: `<` escaped, so no
// `</script>` or `<!--` in the text ends the element.
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c")
}
