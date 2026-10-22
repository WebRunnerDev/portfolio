import type { Post } from "@contracts/api/public"
import { isLang, type Lang } from "@contracts/lang"
import { MESSAGES } from "@contracts/messages"
import { blogFeed, feedPath, pageUrl } from "@contracts/meta"
import { PUBLIC_CACHE_CONTROL } from "../api/public"
import { readFeedPosts } from "../api/routes/public/posts"
import { isPreview } from "../meta/serve-page"

// GET /{lang}/rss.xml: RSS 2.0 of the Blog on a Lang (worker/README.md › RSS).

const PATH = /^\/([^/]+)\/rss\.xml$/

// How many of the newest Posts the feed carries.
export const FEED_SIZE = 20

// The Lang of a /{lang}/rss.xml path, or undefined for any other path.
export function rssLang(pathname: string): Lang | undefined {
  const lang = PATH.exec(pathname)?.[1]
  return isLang(lang) ? lang : undefined
}

// Text for XML: markup escaped, and the control characters XML 1.0 has no
// place for dropped, so no text from D1 breaks the feed.
function xml(value: string) {
  return (
    value
      // eslint-disable-next-line no-control-regex -- dropping them is the point
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;")
  )
}

function element(name: string, text: string, attrs = "") {
  return `<${name}${attrs}>${xml(text)}</${name}>`
}

function item(origin: string, lang: Lang, post: Post) {
  const link = pageUrl(origin, lang, `blog/${encodeURIComponent(post.slug)}`)
  return [
    "<item>",
    element("title", post.title),
    element("link", link),
    element("guid", link, ' isPermaLink="true"'),
    element("pubDate", new Date(post.publishedAt).toUTCString()),
    post.excerpt && element("description", post.excerpt),
    ...post.tags.map((tag) => element("category", tag.name)),
    "</item>",
  ]
    .filter(Boolean)
    .join("")
}

// The feed of `posts` (newest first) on a Lang, titled and described as the
// Blog on that Lang.
export function rssFeed(origin: string, lang: Lang, posts: Post[]): string {
  const { title } = blogFeed(lang, "blog")!
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    element("title", title),
    element("link", pageUrl(origin, lang, "blog")),
    element("description", MESSAGES[lang]["meta.blog"]),
    element("language", lang),
    `<atom:link href="${xml(origin + feedPath(lang))}" rel="self" type="application/rss+xml"/>`,
    ...posts.map((post) => item(origin, lang, post)),
    "</channel>",
    "</rss>",
  ].join("\n")
}

export async function serveRss(
  request: Request,
  env: Env,
  lang: Lang
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } })
  }
  const url = new URL(request.url)

  let posts: Post[]
  try {
    posts = await readFeedPosts(env.DB, lang, FEED_SIZE)
  } catch (error) {
    console.error("rss: no Posts from D1", error)
    return new Response(null, { status: 503 })
  }

  const headers = new Headers({
    "Content-Type": "application/rss+xml; charset=utf-8",
    "Cache-Control": PUBLIC_CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
  })
  if (isPreview(url)) headers.set("X-Robots-Tag", "noindex")
  const body =
    request.method === "HEAD" ? null : rssFeed(url.origin, lang, posts)
  return new Response(body, { headers })
}
