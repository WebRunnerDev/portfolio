import type { Post } from "@contracts/api/public"
import { IMAGE_WIDTHS, imageUrl } from "@contracts/media"
import { formatDate, useLang, useTPlural } from "@/shared/i18n"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"

import { PostTags } from "./post-tags"

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
// `priority` loads the cover at once: the first card's is the LCP. The post's
// own page (#99) makes the card a link.
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
  const tp = useTPlural()

  return (
    <article data-testid="post-card" className="h-full">
      {/* DESIGN.md › Shapes: the outer layer draws the chamfered border. */}
      <div className="h-full bg-zsd-outline-muted p-px chamfer-md">
        <div className="flex h-full flex-col gap-zsd-md bg-zsd-surface-raised p-zsd-xl chamfer-md">
          {post.coverKey && (
            <Cover coverKey={post.coverKey} priority={priority} />
          )}
          <p className="flex flex-wrap gap-x-zsd-sm font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase rtl:normal-case">
            <time dateTime={post.publishedAt}>
              {formatDate(new Date(post.publishedAt), lang)}
            </time>
            <span aria-hidden="true">·</span>
            <span>{tp("blog.readingTime", post.readingMinutes)}</span>
          </p>
          <h2
            lang={fallbackLang(post)}
            className="min-w-0 font-heading text-zsd-headline-sm break-words text-zsd-on-surface"
          >
            {post.title}
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
