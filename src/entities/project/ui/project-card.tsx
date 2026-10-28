import { Link } from "@tanstack/react-router"
import { cn } from "cn"

import type { Project } from "@contracts/api/public"
import { IMAGE_WIDTHS, imageUrl } from "@contracts/media"
import { useLang } from "@/shared/i18n"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"
import { Logo } from "@/shared/ui/logo"

import { ProjectLinks } from "./project-links"
import { ProjectStatus } from "./project-status"
import { ProjectTechnologies } from "./project-technologies"

const MOTION_FAST =
  "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none"

// One column below `sm`, two from `sm`, three from `lg` in the 1200px content
// box (DESIGN.md › Responsive behavior).
const COVER_SIZES = "(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
// The cover is never wider than a card on a 2x screen.
const COVER_WIDTHS = IMAGE_WIDTHS.filter((w) => w <= 1280)

function Cover({
  coverKey,
  priority,
  linked,
  sizes,
}: {
  coverKey: string | null
  priority: boolean
  linked: boolean
  sizes: string
}) {
  if (!coverKey) {
    return (
      <div
        aria-hidden="true"
        className="flex aspect-video items-center justify-center bg-zsd-surface"
      >
        <Logo
          className={cn(
            "size-16 text-zsd-outline-muted",
            linked && "group-hover/card:text-zsd-primary",
            MOTION_FAST
          )}
        />
      </div>
    )
  }
  // Decorative: the title next to it names the card.
  return (
    <img
      src={imageUrl(coverKey, 640)}
      srcSet={COVER_WIDTHS.map((w) => `${imageUrl(coverKey, w)} ${w}w`).join(
        ", "
      )}
      sizes={sizes}
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

// A Project's card (CONTEXT.md › Project), on the Projects page and for the
// Featured ones on the home page. With a Case Study the whole card is one
// link named by its title (DESIGN.md › Card); GitHub and the demo sit above
// it. `priority` loads the cover at once: the first card's is the LCP.
// `heading` is the title's level under the page's own headings; `wide` puts
// the cover beside the text from `lg`, with `sizes` to match.
export function ProjectCard({
  project,
  priority = false,
  heading: Heading = "h2",
  wide = false,
  sizes = COVER_SIZES,
}: {
  project: Project
  priority?: boolean
  heading?: "h2" | "h3"
  wide?: boolean
  sizes?: string
}) {
  const lang = useLang()
  const linked = project.hasCaseStudy

  return (
    <article
      data-testid="project-card"
      className={cn(
        "group/card relative h-full",
        linked &&
          "focus-chamfer-md hover:elevation-accent has-[a.card-link:focus-visible]:elevation-accent"
      )}
    >
      {/* DESIGN.md › Shapes: the outer layer draws the chamfered border. */}
      <div
        className={cn(
          "h-full bg-zsd-outline-muted p-px chamfer-md",
          linked && "group-hover/card:bg-zsd-primary",
          MOTION_FAST
        )}
      >
        <div
          className={cn(
            "flex h-full flex-col gap-zsd-md bg-zsd-surface-raised p-zsd-xl chamfer-md",
            wide && "lg:flex-row lg:gap-zsd-xl"
          )}
        >
          <div className={cn(wide && "shrink-0 lg:w-3/5")}>
            <Cover
              coverKey={project.coverKey}
              priority={priority}
              linked={linked}
              sizes={sizes}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-zsd-md">
            <div className="flex flex-wrap items-start justify-between gap-zsd-sm">
              <Heading
                lang={fallbackLang(project)}
                className="min-w-0 font-heading text-zsd-headline-sm break-words text-zsd-on-surface"
              >
                {linked ? (
                  <Link
                    to="/$lang/projects/$slug"
                    params={{ lang, slug: project.slug }}
                    className="card-link outline-none after:absolute after:inset-0"
                  >
                    {project.title}
                  </Link>
                ) : (
                  project.title
                )}
              </Heading>
              <ProjectStatus status={project.status} />
            </div>
            <FallbackNotice fallback={project.fallback} />
            <p
              lang={fallbackLang(project)}
              className="text-zsd-body-sm text-zsd-on-surface-muted"
            >
              {project.description}
            </p>
            <ProjectTechnologies
              technologies={project.technologies}
              className="mt-auto"
            />
            <ProjectLinks project={project} />
          </div>
        </div>
      </div>
    </article>
  )
}
