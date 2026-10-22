import type { Post } from "@contracts/api/public"
import { formatDate, useLang, useTPlural } from "@/shared/i18n"

// The publication date and reading time of a Post, on its card and its page.
export function PostDate({ post }: { post: Post }) {
  const lang = useLang()
  const tp = useTPlural()

  return (
    <p className="flex flex-wrap gap-x-zsd-sm font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase rtl:normal-case">
      <time dateTime={post.publishedAt}>
        {formatDate(new Date(post.publishedAt), lang)}
      </time>
      <span aria-hidden="true">·</span>
      <span>{tp("blog.readingTime", post.readingMinutes)}</span>
    </p>
  )
}
