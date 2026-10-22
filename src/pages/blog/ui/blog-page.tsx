import { getRouteApi, Link } from "@tanstack/react-router"
import { Rss, X } from "lucide-react"

import type { Post } from "@contracts/api/public"
import { feedPath } from "@contracts/meta"
import { useLang, useT } from "@/shared/i18n"

import { PostCard } from "./post-card"

const route = getRouteApi("/$lang/blog/")

const LINK =
  "inline-flex min-h-zsd-control-height items-center gap-zsd-xs text-zsd-body-sm text-zsd-primary-text underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-ring"

// The Tag's name from a post that has it; an unknown slug stays as it is.
function tagName(posts: Post[], slug: string) {
  for (const post of posts) {
    const tag = post.tags.find((tag) => tag.slug === slug)
    if (tag) return tag.name
  }
  return slug
}

// The published Posts, newest first: one column, two from `sm`, three from
// `lg` (DESIGN.md › Responsive behavior). `?tag=<slug>` keeps the posts with
// that Tag, names it and links back to all of them. An empty list says what
// appears there, or that no post has the Tag. The Lang's RSS feed is linked
// next to the title.
export function BlogPage() {
  const t = useT()
  const lang = useLang()
  const posts = route.useLoaderData()
  const { tag } = route.useSearch()
  const name = tag && tagName(posts, tag)

  // `exact`: with a Tag in the URL it is no link to the current page.
  const reset = (
    <Link
      to="/$lang/blog"
      params={{ lang }}
      activeOptions={{ exact: true }}
      className={LINK}
    >
      <X aria-hidden="true" strokeWidth={1.5} className="size-4" />
      {t("blog.filter.reset")}
    </Link>
  )

  return (
    <div className="mx-auto w-full max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg py-zsd-section md:px-zsd-xxl lg:py-zsd-section-lg">
      <div className="flex flex-wrap items-baseline justify-between gap-x-zsd-lg">
        <h1 className="font-heading text-zsd-headline-md break-words md:text-zsd-headline-lg">
          {t("nav.blog")}
        </h1>
        {/* The Worker's, not a route: a full load. */}
        <a href={feedPath(lang)} type="application/rss+xml" className={LINK}>
          <Rss aria-hidden="true" strokeWidth={1.5} className="size-4" />
          {t("blog.rss")}
        </a>
      </div>
      {name && posts.length > 0 && (
        <div
          data-testid="blog-filter"
          className="mt-zsd-md flex flex-wrap items-center gap-x-zsd-lg"
        >
          <p className="text-zsd-body-md text-zsd-on-surface">
            {t("blog.filter").replace("{tag}", name)}
          </p>
          {reset}
        </div>
      )}
      {posts.length > 0 ? (
        <ul className="mt-zsd-xl grid gap-zsd-xl sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <li key={post.id}>
              <PostCard post={post} activeTag={tag} priority={i === 0} />
            </li>
          ))}
        </ul>
      ) : (
        <div
          data-testid="blog-empty"
          className="mt-zsd-xl flex flex-col items-center gap-zsd-md border border-zsd-outline-muted bg-zsd-surface-raised p-zsd-xl text-center"
        >
          <div aria-hidden="true" className="flex gap-zsd-xs">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-3 rotate-45 bg-zsd-outline-muted" />
            ))}
          </div>
          <h2 className="font-heading text-zsd-headline-sm text-zsd-on-surface">
            {t(name ? "blog.emptyTag.title" : "blog.empty.title")}
          </h2>
          <p className="max-w-(--zsd-x-zsd-layout-prose-max) text-zsd-body-sm text-zsd-on-surface-muted">
            {name
              ? t("blog.emptyTag.text").replace("{tag}", name)
              : t("blog.empty.text")}
          </p>
          {name && reset}
        </div>
      )}
    </div>
  )
}
