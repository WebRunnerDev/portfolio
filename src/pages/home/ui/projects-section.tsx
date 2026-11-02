import { use } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { cn } from "cn"

import type { Project } from "@contracts/api/public"
import { ProjectStatus, ProjectTechnologies } from "@/entities/project"
import { useLang, useT } from "@/shared/i18n"
import { CARD_TITLE_SHIFT } from "@/shared/ui/card"
import { fallbackLang } from "@/shared/ui/fallback-notice"
import { Reveal } from "@/shared/ui/reveal"

import { HomeSection } from "./home-section"

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
const MOTION_FAST =
  "duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none"
// After the title of a row that is a link: says it leads somewhere.
const ROW_ARROW =
  "ms-zsd-sm inline size-4 align-[-0.1em] text-zsd-primary-text rtl:rotate-180"

// The Projects (docs/design-brief.md › Ритм главной): dense, every Project as
// one row, no covers: the title and the status, a two-line description and
// the technologies. A row with a Case Study is one link to its page, named by
// the title, with an arrow after it; on hover and focus, as a card, a rust tile shows at its start
// and the title moves 4px along the reading direction. Leads to the Projects
// page. Not shown without a Project.
export function ProjectsSection({
  projects,
}: {
  projects: Promise<Project[]>
}) {
  const lang = useLang()
  const t = useT()
  const list = use(projects)
  if (list.length === 0) return null

  return (
    <HomeSection
      id="projects"
      title={t("nav.projects")}
      link="/$lang/projects"
      linkText={t("home.projects.link")}
      className="pt-zsd-section lg:pt-zsd-section-lg"
    >
      <ul className="mt-zsd-xl border-b border-zsd-outline-muted">
        {list.map((project, i) => {
          const linked = project.hasCaseStudy
          return (
            <Reveal
              as="li"
              key={project.id}
              order={Math.min(i, 3)}
              className="border-t border-zsd-outline-muted"
            >
              <article
                data-testid="project-row"
                className={cn(
                  "relative grid gap-x-zsd-xl gap-y-zsd-sm py-zsd-lg md:grid-cols-[minmax(0,1fr)_auto]",
                  linked && "group/card"
                )}
              >
                <h3
                  lang={fallbackLang(project)}
                  className="flex min-w-0 items-baseline gap-zsd-sm font-heading text-zsd-headline-sm break-words text-zsd-on-surface"
                >
                  <span
                    aria-hidden="true"
                    className={`size-2 shrink-0 rotate-45 bg-zsd-primary opacity-0 transition-opacity card-active:opacity-100 ${MOTION_FAST}`}
                  />
                  {linked ? (
                    <Link
                      to="/$lang/projects/$slug"
                      params={{ lang, slug: project.slug }}
                      className={`card-link min-w-0 after:absolute after:inset-0 ${FOCUS_RING}`}
                    >
                      <span className={CARD_TITLE_SHIFT}>
                        {project.title}
                        <ArrowRight
                          aria-hidden
                          strokeWidth={1.5}
                          className={ROW_ARROW}
                        />
                      </span>
                    </Link>
                  ) : (
                    <span className="min-w-0">{project.title}</span>
                  )}
                </h3>
                <div className="ps-zsd-lg md:col-start-2 md:row-start-1 md:ps-0">
                  <ProjectStatus status={project.status} />
                </div>
                <p
                  lang={fallbackLang(project)}
                  className="line-clamp-2 max-w-(--zsd-x-zsd-layout-prose-max) ps-zsd-lg text-zsd-body-md text-zsd-on-surface-muted"
                >
                  {project.description}
                </p>
                <ProjectTechnologies
                  technologies={project.technologies}
                  className="ps-zsd-lg md:col-span-2"
                />
              </article>
            </Reveal>
          )
        })}
      </ul>
    </HomeSection>
  )
}
