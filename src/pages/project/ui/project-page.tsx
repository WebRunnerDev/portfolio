import { Link, getRouteApi } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { IMAGE_WIDTHS, imageUrl } from "@contracts/media"
import {
  ProjectLinks,
  ProjectStatus,
  ProjectTechnologies,
} from "@/entities/project"
import { useLang, useT } from "@/shared/i18n"
import { sharedCover } from "@/shared/lib/view-transition"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"
import { Markdown } from "@/shared/ui/markdown"

const route = getRouteApi("/$lang/projects/$slug")

// Half of the 1200px content box from `lg`, the full width below.
const COVER_SIZES = "(min-width: 1024px) 568px, 100vw"

// The header of a Project (title, status, technologies, links, cover) and its
// Case Study. The cover is the LCP, so it loads at once.
export function ProjectPage() {
  const lang = useLang()
  const t = useT()
  const { project, caseStudy } = route.useLoaderData()
  const { coverKey } = project
  const textLang = fallbackLang(project)

  return (
    <article className="mx-auto w-full max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg py-zsd-section md:px-zsd-xxl lg:py-zsd-section-lg">
      <Link
        to="/$lang/projects"
        params={{ lang }}
        className="inline-flex min-h-zsd-control-height items-center gap-zsd-xs text-zsd-body-sm text-zsd-primary-text underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeft
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-4 rtl:rotate-180"
        />
        {t("nav.projects")}
      </Link>
      <header className="mt-zsd-lg grid gap-zsd-xl lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col items-start gap-zsd-md">
          <h1
            lang={textLang}
            className="font-heading text-zsd-headline-md break-words md:text-zsd-headline-lg"
          >
            {project.title}
          </h1>
          <ProjectStatus status={project.status} />
          <FallbackNotice fallback={project.fallback} />
          <p
            lang={textLang}
            className="max-w-(--zsd-x-zsd-layout-prose-max) text-zsd-body-lg text-zsd-on-surface-muted"
          >
            {project.description}
          </p>
          <ProjectTechnologies technologies={project.technologies} />
          <ProjectLinks project={project} />
        </div>
        {coverKey && (
          // Decorative: the title names the page. The card's cover grows
          // into it.
          <img
            {...sharedCover("project", project.slug)}
            src={imageUrl(coverKey, 1280)}
            srcSet={IMAGE_WIDTHS.map(
              (w) => `${imageUrl(coverKey, w)} ${w}w`
            ).join(", ")}
            sizes={COVER_SIZES}
            width={1280}
            height={720}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="aspect-video w-full border border-zsd-outline-muted bg-zsd-surface-raised object-cover"
          />
        )}
      </header>
      <Markdown
        tree={caseStudy}
        lang={textLang}
        className="mt-zsd-section max-w-(--zsd-x-zsd-layout-prose-max) lg:mt-zsd-section-lg"
      />
    </article>
  )
}
