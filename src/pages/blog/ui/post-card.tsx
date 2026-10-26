import { Link } from "@tanstack/react-router"
import { cn } from "cn"

import type { Post } from "@contracts/api/public"
import { IMAGE_WIDTHS, imageUrl } from "@contracts/media"
import { useLang } from "@/shared/i18n"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"

import { PostDate } from "./post-date"
import { PostTags } from "./post-tags"

const MOTION_FAST =
  "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none"

// One column below `sm`, two from `sm`, three from `lg` in the 1200px content
// box (DESIGN.md › Responsive behavior), as the Projects grid.
const COVER_SIZES = "(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
// The cover is never wider than a card on a 2x screen.
const COVER_WIDTHS = IMAGE_WIDTHS.filter((w) => w <= 1280)

// Decorative: the title next to it names the card. A post's cover has no
// stored size, so the box is 16:9, as a Project's.
function Cover({
  coverKey,
  priority,
}: {
  coverKey: string
  priority: boolean
}) {
  return (
    <img
      src={imageUrl(coverKey, 640)}
      srcSet={COVER_WIDTHS.map((w) => `${imageUrl(coverKey, w)} ${w}w`).join(
        ", "
      )}
      sizes={COVER_SIZES}
      width={1280}
      height={720}
      alt=""
      decoding="async"
      {...(priority
        ? { fetchPriority: "high" as const }
        : { loading: "lazy" as const })}
      className="aspect-video w-full bg-zsd-surface object-cover"
    />
  )
}

// A Post's card (CONTEXT.md › Post) on the Blog page: its cover if it has
// one, date and reading time, title, excerpt and Tags, which filter the list.
// The whole card is one link to the post, named by its title (DESIGN.md ›
// Card); the Tags sit above it. `priority` loads the cover at once: the first
// card's is the LCP.
export function PostCard({
  post,
  activeTag,
  priority = false,
}: {
  post: Post
  activeTag: string | undefined
  priority?: boolean
}) {
  const lang = useLang()

  return (
    <article
      data-testid="post-card"
      className="group/card focus-chamfer-md relative h-full hover:elevation-accent has-[a.card-link:focus-visible]:elevation-accent"
    >
      {/* DESIGN.md › Shapes: the outer layer draws the chamfered border. */}
      <div
        className={cn(
          "h-full bg-zsd-outline-muted p-px chamfer-md group-hover/card:bg-zsd-primary",
          MOTION_FAST
        )}
      >
        <div className="flex h-full flex-col gap-zsd-md bg-zsd-surface-raised p-zsd-xl chamfer-md">
          {post.coverKey && (
            <Cover coverKey={post.coverKey} priority={priority} />
          )}
          <PostDate post={post} />
          <h2
            lang={fallbackLang(post)}
            className="min-w-0 font-heading text-zsd-headline-sm break-words text-zsd-on-surface"
          >
            <Link
              to="/$lang/blog/$slug"
              params={{ lang, slug: post.slug }}
              className="card-link outline-none after:absolute after:inset-0"
            >
              {post.title}
            </Link>
          </h2>
          <FallbackNotice fallback={post.fallback} />
          {post.excerpt && (
            <p
              lang={fallbackLang(post)}
              className="text-zsd-body-sm text-zsd-on-surface-muted"
            >
              {post.excerpt}
            </p>
          )}
          <PostTags
            tags={post.tags}
            activeTag={activeTag}
            className="mt-auto"
          />
        </div>
      </div>
    </article>
  )
}
