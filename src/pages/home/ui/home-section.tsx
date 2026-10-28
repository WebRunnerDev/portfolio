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

// A section of the home page below the hero (docs/design-brief.md › Home
// rhythm): its index in `label-mono`, a `headline-md` title rising word by
// word, the content, and one link to its part of the site at the end. The
// index is a CSS counter on the sections actually shown (the hero is 01), so
// a hidden empty section leaves no gap. `className` sets the section's own
// spacing; `content` is false when the content lays itself out past the
// content box (the gallery strip).
export function HomeSection({
  id,
  title,
  link,
  linkText,
  className,
  content = true,
  children,
}: {
  id: string
  title: string
  link: "/$lang/cv" | "/$lang/projects" | "/$lang/blog" | "/$lang/gallery"
  linkText: string
  className?: string
  content?: boolean
  children: ReactNode
}) {
  const lang = useLang()

  return (
    <section
      data-testid={`home-${id}`}
      aria-labelledby={`home-${id}-title`}
      className={cn("[counter-increment:home-section]", className)}
    >
      <div className={CONTENT}>
        <Reveal
          as="p"
          className="font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted"
        >
          <span
            aria-hidden="true"
            className="before:content-[counter(home-section,decimal-leading-zero)]"
          />
        </Reveal>
        <div id={`home-${id}-title`}>
          <RevealText
            as="h2"
            text={title}
            delay={0.1}
            className="mt-zsd-sm font-heading text-zsd-headline-md break-words hyphens-auto text-zsd-on-surface"
          />
        </div>
      </div>
      {content ? <div className={CONTENT}>{children}</div> : children}
      <div className={CONTENT}>
        <Reveal className="mt-zsd-xl">
          <Link
            to={link}
            params={{ lang }}
            className={`group/more inline-flex min-h-zsd-control-height items-center gap-zsd-sm font-zsd-label-md text-zsd-label-md text-zsd-primary-text underline-offset-4 hover:underline ${FOCUS_RING}`}
          >
            {linkText}
            <ArrowRight
              aria-hidden
              strokeWidth={1.5}
              className="size-4 transition-transform duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover group-hover/more:translate-x-1 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover/more:-translate-x-1"
            />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
