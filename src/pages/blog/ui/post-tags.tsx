import { Link } from "@tanstack/react-router"
import { cn } from "cn"

import type { Tag } from "@contracts/api/public"
import { useLang, useT } from "@/shared/i18n"

const MOTION_FAST =
  "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none"

// DESIGN.md › Badge, as links that filter the list by their Tag, lifted above
// the stretched link of a card by `relative z-10`. The one the list is
// filtered by is `primary`; the router marks it `aria-current`.
export function PostTags({
  tags,
  activeTag,
  className,
}: {
  tags: Tag[]
  activeTag: string | undefined
  className?: string
}) {
  const lang = useLang()
  const t = useT()
  if (tags.length === 0) return null

  return (
    <ul
      aria-label={t("blog.tags")}
      className={cn("flex flex-wrap gap-zsd-xs", className)}
    >
      {tags.map((tag) => {
        const active = tag.slug === activeTag
        return (
          <li key={tag.slug}>
            <Link
              to="/$lang/blog"
              params={{ lang }}
              search={{ tag: tag.slug }}
              className={cn(
                "relative z-10 inline-flex min-h-zsd-control-height items-center border bg-zsd-surface px-zsd-sm font-zsd-label-mono text-zsd-label-mono uppercase outline-offset-2 hover:border-zsd-primary hover:text-zsd-primary-text focus-visible:outline-2 focus-visible:outline-ring rtl:normal-case",
                active
                  ? "border-zsd-primary text-zsd-primary-text"
                  : "border-zsd-outline-muted text-zsd-on-surface-muted",
                MOTION_FAST
              )}
            >
              {tag.name}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
