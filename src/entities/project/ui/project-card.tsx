import { Link } from "@tanstack/react-router"
import { ExternalLink } from "lucide-react"
import { cn } from "cn"

import type { Project } from "@contracts/api/public"
import { IMAGE_WIDTHS, imageUrl } from "@contracts/media"
import { useLang, useT } from "@/shared/i18n"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"
import { Logo } from "@/shared/ui/logo"

import { ProjectStatus } from "./project-status"

const MOTION_FAST =
  "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-(--zsd-x-zsd-motion-easing-standard) motion-reduce:transition-none"

const LINK =
  "relative z-10 inline-flex min-h-zsd-control-height items-center gap-zsd-xs text-zsd-body-sm text-zsd-primary-text underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-ring"

// One column below `sm`, two from `sm`, three from `lg` in the 1200px content
// box (DESIGN.md › Responsive behavior).
const COVER_SIZES = "(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
// The cover is never wider than a card on a 2x screen.
const COVER_WIDTHS = IMAGE_WIDTHS.filter((w) => w <= 1280)

function Cover({
  coverKey,
  priority,
  linked,
}: {
  coverKey: string | null
  priority: boolean
  linked: boolean
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

// A Project's card (CONTEXT.md › Project), on the Projects page and, later,
// for the Featured ones on the home page. With a Case Study the whole card is
// one link named by its title (DESIGN.md › Card); GitHub and the demo sit
// above it. `priority` loads the cover at once: the first card's is the LCP.
export function ProjectCard({
  project,
  priority = false,
}: {
  project: Project
  priority?: boolean
}) {
  const lang = useLang()
  const t = useT()
  const linked = project.hasCaseStudy

  return (
    <article
      data-testid="project-card"
      className={cn(
        "group/card relative h-full",
        linked &&
          "hover:elevation-accent has-[a.card-link:focus-visible]:outline-2 has-[a.card-link:focus-visible]:outline-offset-2 has-[a.card-link:focus-visible]:outline-ring has-[a.card-link:focus-visible]:elevation-accent"
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
        <div className="flex h-full flex-col gap-zsd-md bg-zsd-surface-raised p-zsd-xl chamfer-md">
          <Cover
            coverKey={project.coverKey}
            priority={priority}
            linked={linked}
          />
          <div className="flex flex-wrap items-start justify-between gap-zsd-sm">
            <h2
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
            </h2>
            <ProjectStatus status={project.status} />
          </div>
          <FallbackNotice fallback={project.fallback} />
          <p
            lang={fallbackLang(project)}
            className="text-zsd-body-sm text-zsd-on-surface-muted"
          >
            {project.description}
          </p>
          {project.technologies.length > 0 && (
            <ul className="mt-auto flex flex-wrap gap-zsd-xs">
              {project.technologies.map((tech) => (
                <li
                  key={tech.id}
                  className="border border-zsd-outline-muted bg-zsd-surface px-zsd-sm py-zsd-xs font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase rtl:normal-case"
                >
                  {tech.name}
                </li>
              ))}
            </ul>
          )}
          {(project.githubUrl || project.demoUrl) && (
            <p className="flex flex-wrap gap-x-zsd-lg">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={LINK}
                >
                  GitHub
                  <ExternalLink
                    aria-hidden="true"
                    strokeWidth={1.5}
                    className="size-4 rtl:-scale-x-100"
                  />
                </a>
              )}
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={LINK}
                >
                  {t("project.demo")}
                  <ExternalLink
                    aria-hidden="true"
                    strokeWidth={1.5}
                    className="size-4 rtl:-scale-x-100"
                  />
                </a>
              )}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
