import { use } from "react"
import { Link } from "@tanstack/react-router"

import type { Post } from "@contracts/api/public"
import { formatDate, useLang, useT } from "@/shared/i18n"
import { fallbackLang } from "@/shared/ui/fallback-notice"
import { Reveal } from "@/shared/ui/reveal"

import { HomeSection } from "./home-section"

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
const MOTION_FAST =
  "duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none"

// The latest Posts (docs/design-brief.md › Home rhythm): dense and
// chamber-sized, a list of three, the date and the title, no covers. Each
// row links to its post; on hover and focus, as a card, a rust tile shows
// at its start and the title moves 4px along the reading direction. Leads to
// the Blog. Not shown without a published Post.
export function PostsSection({ posts }: { posts: Promise<Post[]> }) {
  const lang = useLang()
  const t = useT()
  const latest = use(posts)
  if (latest.length === 0) return null

  return (
    <HomeSection
      id="posts"
      title={t("home.posts.title")}
      link="/$lang/blog"
      linkText={t("home.posts.link")}
      className="pt-zsd-section"
    >
      <ul className="mt-zsd-xl max-w-(--zsd-x-zsd-layout-prose-max) border-b border-zsd-outline-muted">
        {latest.map((post, i) => (
          <Reveal
            as="li"
            key={post.id}
            order={i}
            className="border-t border-zsd-outline-muted"
          >
            <Link
              to="/$lang/blog/$slug"
              params={{ lang, slug: post.slug }}
              className={`group/card flex flex-col gap-x-zsd-xl gap-y-zsd-xs py-zsd-md sm:flex-row sm:items-baseline ${FOCUS_RING}`}
            >
              <time
                dateTime={post.publishedAt}
                className="shrink-0 font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase sm:w-32 rtl:normal-case"
              >
                {formatDate(new Date(post.publishedAt), lang)}
              </time>
              <span className="flex min-w-0 items-baseline gap-zsd-sm">
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rotate-45 bg-zsd-primary opacity-0 transition-opacity card-active:opacity-100 ${MOTION_FAST}`}
                />
                <span
                  lang={fallbackLang(post)}
                  className={`min-w-0 font-heading text-zsd-headline-sm break-words text-zsd-on-surface transition-transform card-active:translate-x-1 rtl:card-active:-translate-x-1 ${MOTION_FAST}`}
                >
                  {post.title}
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </HomeSection>
  )
}
