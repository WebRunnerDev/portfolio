import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { cn } from "cn"

import { useLang } from "@/shared/i18n"
import { Reveal, RevealText } from "@/shared/ui/reveal"

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"

// The content box of the page, as the hero's.
export const CONTENT =
  "mx-auto w-full max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg md:px-zsd-xxl"

// From `lg` the content box is four columns `xxl` apart: a section's title
// holds the first, its content the other three.
const CHAPTER =
  "lg:grid lg:grid-cols-4 lg:gap-x-zsd-xxl lg:[&>*:last-child]:col-span-3"

// From `lg`, where a section's content starts: the hero's subtitle and
// actions stand on the same line.
export const CONTENT_START =
  "lg:ms-[calc((100%-3*var(--zsd-spacing-xxl))/4+var(--zsd-spacing-xxl))]"

// A section of the home page below the hero (docs/design-brief.md › Ритм
// главной), opened as a chapter: a hairline across the content box with a
// rust tile and the index in `label-mono` on it (`chapter-open` in
// index.css: they open with the scroll), then the index again as a large
// `outline-muted` figure (`chapter-numeral`, decoration: it rises with the
// rule) over a `headline-lg` title rising word by word, the content, and one
// link to its part of the site at the end, as a `button-secondary` with an
// arrow, so it reads as the way on. From `lg` the figure and the title hold
// the first quarter and stay in view under the header while their section
// scrolls by; the content takes the other three quarters, on the line of the
// hero's subtitle. A `wide` section (the Gallery
// banner) keeps the title above and its content across the whole box, for
// the airy beat of the rhythm. The index is a CSS counter on the sections
// actually shown (the hero is 01), so a hidden empty section leaves no gap.
// `actions` stand beside the link (the CV PDF). `className` sets the
// section's own spacing.
export function HomeSection({
  id,
  title,
  link,
  linkText,
  actions,
  className,
  wide = false,
  children,
}: {
  id: string
  title: string
  link?: "/$lang/cv" | "/$lang/projects" | "/$lang/blog"
  linkText?: string
  actions?: ReactNode
  className?: string
  wide?: boolean
  children: ReactNode
}) {
  const lang = useLang()

  return (
    <section
      data-testid={`home-${id}`}
      aria-labelledby={`home-${id}-title`}
      className={cn("chapter [counter-increment:home-section]", className)}
    >
      <div className={CONTENT}>
        <Reveal
          as="p"
          y={0}
          className="chapter-open flex items-center gap-zsd-md pt-zsd-md font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted"
        >
          <span aria-hidden="true" className="chapter-tile" />
          <span aria-hidden="true" className="chapter-index" />
        </Reveal>
        <div className={cn("mt-zsd-lg", !wide && CHAPTER)}>
          <div
            id={`home-${id}-title`}
            className={cn(
              !wide &&
                "lg:sticky lg:top-[calc(var(--zsd-x-zsd-layout-header-height)+var(--zsd-spacing-xl))] lg:self-start"
            )}
          >
            <span aria-hidden="true" className="mb-zsd-md chapter-numeral" />
            <RevealText
              as="h2"
              text={title}
              delay={0.1}
              className="font-heading text-zsd-headline-lg break-words hyphens-auto text-zsd-on-surface [&:lang(ar)]:tracking-normal"
            />
          </div>
          <div className={cn(!wide && "lg:[&>*:first-child]:mt-0")}>
            {children}
            {link && (
              <Reveal className="mt-zsd-xl flex flex-wrap items-center gap-x-zsd-xl gap-y-zsd-md">
                <Link
                  to={link}
                  params={{ lang }}
                  className={`group/more inline-flex min-h-zsd-control-height items-center gap-zsd-sm border border-zsd-outline bg-zsd-surface px-zsd-lg font-zsd-label-md text-zsd-label-md text-zsd-on-surface transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover hover:border-zsd-primary hover:bg-zsd-surface-raised focus-visible:bg-zsd-surface-raised active:bg-zsd-surface-raised motion-reduce:transition-none ${FOCUS_RING}`}
                >
                  {linkText}
                  <ArrowRight
                    aria-hidden
                    strokeWidth={1.5}
                    className="size-4 text-zsd-primary-text transition-transform duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover group-hover/more:translate-x-1 group-focus-visible/more:translate-x-1 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover/more:-translate-x-1 rtl:group-focus-visible/more:-translate-x-1"
                  />
                </Link>
                {actions}
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
