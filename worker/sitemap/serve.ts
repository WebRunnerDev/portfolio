import { DEFAULT_LANG, LANGS, type Lang } from "@contracts/lang"
import { PAGE_PATHS, alternates, pageMeta, pageUrl } from "@contracts/meta"
import { PUBLIC_CACHE_CONTROL, parseJson } from "../api/public"
import { isPreview } from "../meta/serve-page"
import { xml } from "../xml"

// GET /sitemap.xml: every page to find, on every Lang it has, with hreflang
// (worker/README.md › Sitemap).

export const SITEMAP_PATH = "/sitemap.xml"

// A page on the Langs it has: one <url> per Lang, each listing all of them.
export type SitemapPage = {
  // The path after the Lang, as `pageUrl` takes it.
  path: string
  langs: readonly Lang[]
  // W3C datetime of the last change; none for the sections.
  lastmod?: string
}

// The sections (not the design page: it is `noindex`), on every Lang.
const SECTIONS: SitemapPage[] = PAGE_PATHS.filter(
  (path) => !pageMeta(DEFAULT_LANG, path)?.noindex
).map((path) => ({ path, langs: LANGS }))

// The Langs a record's page answers on: a Translation of its own, else EN
// (CONTEXT.md › Fallback). `has` says whether that Translation makes a page.
function pageLangs<T extends { lang: Lang }>(
  translations: readonly T[],
  has: (translation: T) => boolean = () => true
): Lang[] {
  const on = (lang: Lang) => translations.find((t) => t.lang === lang)
  return LANGS.filter((lang) => {
    const translation = on(lang) ?? on(DEFAULT_LANG)
    return translation !== undefined && has(translation)
  })
}

const slugPath = (section: string, slug: string) =>
  `${section}/${encodeURIComponent(slug)}`

// A Project's page needs a Case Study on the Translation it shows.
async function projectPages(db: D1Database): Promise<SitemapPage[]> {
  const { results } = await db
    .prepare(
      `SELECT p.slug, p.updated_at, (
        SELECT json_group_array(json_object(
          'lang', lang, 'caseStudy', case_study IS NOT NULL
        ))
        FROM project_translation WHERE project_id = p.id
      ) AS translations
      FROM project p ORDER BY p.position, p.id`
    )
    .all<{ slug: string; updated_at: string; translations: string }>()
  return results.map((row) => ({
    path: slugPath("projects", row.slug),
    langs: pageLangs(
      parseJson<{ lang: Lang; caseStudy: number }[]>(row.translations),
      (t) => t.caseStudy === 1
    ),
    lastmod: row.updated_at,
  }))
}

// An Album changes when a photo is added: its newest photo dates it.
async function albumPages(db: D1Database): Promise<SitemapPage[]> {
  const { results } = await db
    .prepare(
      `SELECT a.slug, max(a.created_at, coalesce(
        (SELECT max(created_at) FROM photo WHERE album_id = a.id), ''
      )) AS lastmod, (
        SELECT json_group_array(lang) FROM album_translation
        WHERE album_id = a.id
      ) AS langs
      FROM album a ORDER BY a.position, a.id`
    )
    .all<{ slug: string; lastmod: string; langs: string }>()
  return results.map((row) => ({
    path: slugPath("gallery", row.slug),
    langs: pageLangs(parseJson<Lang[]>(row.langs).map((lang) => ({ lang }))),
    lastmod: row.lastmod,
  }))
}

// A published Post, only on the Langs it is translated on: a Fallback page
// would repeat the EN one, and its hreflang leaves it out too (postMeta).
async function postPages(db: D1Database): Promise<SitemapPage[]> {
  const { results } = await db
    .prepare(
      `SELECT p.slug, p.updated_at, (
        SELECT json_group_array(lang) FROM post_translation
        WHERE post_id = p.id
      ) AS langs
      FROM post p WHERE p.status = 'published'
      ORDER BY p.published_at DESC, p.id DESC`
    )
    .all<{ slug: string; updated_at: string; langs: string }>()
  return results.map((row) => {
    const translated = parseJson<Lang[]>(row.langs)
    return {
      path: slugPath("blog", row.slug),
      langs: LANGS.filter((lang) => translated.includes(lang)),
      lastmod: row.updated_at,
    }
  })
}

export async function readSitemapPages(db: D1Database): Promise<SitemapPage[]> {
  const [projects, albums, posts] = await Promise.all([
    projectPages(db),
    albumPages(db),
    postPages(db),
  ])
  return [...SECTIONS, ...projects, ...albums, ...posts].filter(
    (page) => page.langs.length > 0
  )
}

function entry(origin: string, page: SitemapPage, lang: Lang) {
  return [
    "<url>",
    `<loc>${xml(pageUrl(origin, lang, page.path))}</loc>`,
    page.lastmod && `<lastmod>${xml(page.lastmod)}</lastmod>`,
    ...alternates(origin, page.path, page.langs).map(
      ({ hrefLang, href }) =>
        `<xhtml:link rel="alternate" hreflang="${hrefLang}" href="${xml(href)}"/>`
    ),
    "</url>",
  ]
    .filter(Boolean)
    .join("")
}

export function sitemap(origin: string, pages: readonly SitemapPage[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...pages.flatMap((page) =>
      page.langs.map((lang) => entry(origin, page, lang))
    ),
    "</urlset>",
  ].join("\n")
}

export async function serveSitemap(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } })
  }
  const url = new URL(request.url)

  let pages: SitemapPage[]
  try {
    pages = await readSitemapPages(env.DB)
  } catch (error) {
    console.error("sitemap: no pages from D1", error)
    return new Response(null, { status: 503 })
  }

  const headers = new Headers({
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": PUBLIC_CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
  })
  if (isPreview(url)) headers.set("X-Robots-Tag", "noindex")
  const body = request.method === "HEAD" ? null : sitemap(url.origin, pages)
  return new Response(body, { headers })
}
