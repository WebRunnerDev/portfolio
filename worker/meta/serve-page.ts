// Meta Injection (ADR-0001): HTML navigations under a Lang get index.html with
// their <html lang dir>, title, description, OG, canonical and hreflang.
import { LANGS, langDirection, type Lang } from "@contracts/lang"
import {
  BRAND,
  DEFAULT_OG_IMAGE,
  OG_LOCALES,
  alternates,
  blogFeed,
  blogPosting,
  jsonLd,
  notFoundMeta,
  pageUrl,
  parsePagePath,
  type PageMeta,
} from "@contracts/meta"
import { pageRequests } from "@contracts/page-requests"
import { ROUTE_ATTRIBUTE, routeMatches } from "@contracts/route-preloads"
import { resolveMeta } from "./pages"

// Marks the injected tags; LangHead removes them once React renders its own.
const MARK = "data-meta"

function escape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function tag(name: string, attrs: Record<string, string>) {
  const list = Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${escape(value)}"`)
    .join("")
  return `<${name} ${MARK}${list}>`
}

// Preview URLs (`<branch>-webrunner.<subdomain>.workers.dev`) stay out of
// search results.
export function isPreview(url: URL) {
  return url.hostname.endsWith(".workers.dev")
}

export function headTags(
  url: URL,
  lang: Lang,
  path: string,
  meta: PageMeta,
  noindex: boolean
): string {
  const href = pageUrl(url.origin, lang, path)
  const image = new URL(meta.image ?? DEFAULT_OG_IMAGE, url.origin).href
  const property = (name: string, content: string) =>
    tag("meta", { property: name, content })
  const { article, langs = LANGS } = meta
  const posting = blogPosting(url.origin, lang, path, meta)
  const feed = blogFeed(lang, path)

  return [
    tag("meta", { name: "description", content: meta.description }),
    noindex && tag("meta", { name: "robots", content: "noindex" }),
    tag("link", { rel: "canonical", href }),
    ...alternates(url.origin, path, langs).map(({ hrefLang, href }) =>
      tag("link", { rel: "alternate", hreflang: hrefLang, href })
    ),
    feed &&
      tag("link", {
        rel: "alternate",
        type: "application/rss+xml",
        title: feed.title,
        href: new URL(feed.path, url.origin).href,
      }),
    property("og:type", article ? "article" : "website"),
    property("og:site_name", BRAND),
    property("og:title", meta.title),
    property("og:description", meta.description),
    property("og:image", image),
    property("og:url", href),
    property("og:locale", OG_LOCALES[lang]),
    ...LANGS.filter((l) => l !== lang && langs.includes(l)).map((l) =>
      property("og:locale:alternate", OG_LOCALES[l])
    ),
    article && property("article:published_time", article.publishedTime),
    article && property("article:modified_time", article.modifiedTime),
    tag("meta", { name: "twitter:card", content: "summary_large_image" }),
    // Not run as a script: CSP leaves it alone.
    posting &&
      `<script ${MARK} type="application/ld+json">${jsonLd(posting)}</script>`,
  ]
    .filter(Boolean)
    .join("")
}

// The page's Public API requests (contracts/page-requests.ts), preloaded so
// they run alongside the app's code. `crossorigin`: the same credentials
// mode as the app's `fetch`, or the browser wouldn't use them.
export function dataPreloads(
  lang: Lang,
  path: string,
  search: URLSearchParams
) {
  return pageRequests(path, search)
    .map(
      (request) =>
        `<link rel="preload" as="fetch" crossorigin href="${escape(`/api/public/${lang}/${request}`)}">`
    )
    .join("")
}

// index.html for a path under a Lang, or null for any other path.
export async function servePage(
  request: Request,
  env: Env
): Promise<Response | null> {
  const url = new URL(request.url)
  const page = parsePagePath(url.pathname)
  if (!page) return null

  // Always the root index.html: its ETag would be the same for every page,
  // so the request goes without the client's conditions.
  const html = await env.ASSETS.fetch(new URL("/", url), {
    method: request.method,
  })
  if (!html.ok || !html.headers.get("Content-Type")?.includes("text/html")) {
    return html
  }

  const { lang, path } = page
  const found = await resolveMeta(env, lang, path)
  const meta = found ?? notFoundMeta(lang)
  const preview = isPreview(url)
  const noindex = preview || !!meta.noindex

  const headers = new Headers(html.headers)
  headers.delete("ETag")
  headers.delete("Content-Length")
  if (preview) headers.set("X-Robots-Tag", "noindex")

  const rewritten = new HTMLRewriter()
    .on("html", {
      element(el) {
        el.setAttribute("lang", lang)
        el.setAttribute("dir", langDirection(lang))
      },
    })
    .on("head > title", {
      element(el) {
        el.setInnerContent(meta.title)
      },
    })
    .on("head", {
      element(el) {
        el.append(headTags(url, lang, path, meta, noindex), { html: true })
        if (found) {
          el.append(dataPreloads(lang, path, url.searchParams), { html: true })
        }
      },
    })
    // Route preloads (contracts/route-preloads.ts): the page's own stay.
    .on(`link[${ROUTE_ATTRIBUTE}]`, {
      element(el) {
        const routes = el.getAttribute(ROUTE_ATTRIBUTE)?.split(" ") ?? []
        if (routes.some((route) => routeMatches(route, url.pathname))) {
          el.removeAttribute(ROUTE_ATTRIBUTE)
        } else {
          el.remove()
        }
      },
    })
    .transform(html)

  return new Response(rewritten.body, {
    status: found ? 200 : 404,
    headers,
  })
}
