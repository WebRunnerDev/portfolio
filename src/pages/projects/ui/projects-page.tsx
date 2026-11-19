import { getRouteApi } from "@tanstack/react-router"

import { ProjectCard } from "@/entities/project"
import { useT, useTPlural } from "@/shared/i18n"
import { ItemStrip, type StripItem } from "@/shared/ui/item-strip"

const route = getRouteApi("/$lang/projects/")

const STATE = {
  completed: "done",
  in_progress: "active",
  archived: "archived",
} as const

// The Projects in D1's order: one column, two from `sm`, three from `lg`
// (DESIGN.md › Responsive behavior). An empty list says what appears there.
export function ProjectsPage() {
  const t = useT()
  const tp = useTPlural()
  const projects = route.useLoaderData()
  const active = projects.filter((p) => p.status === "in_progress").length
  const strip: StripItem[] = projects.map((project) => ({
    key: project.slug,
    label: project.title,
    state: STATE[project.status],
    detail: t(`project.status.${project.status}`),
  }))

  return (
    <div className="mx-auto w-full max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg py-zsd-section md:px-zsd-xxl lg:py-zsd-section-lg">
      <h1 className="font-heading text-zsd-headline-md break-words md:text-zsd-headline-lg">
        {t("nav.projects")}
      </h1>
      <ItemStrip
        items={strip}
        summary={[
          tp("strip.projects", projects.length),
          active > 0 && tp("strip.inProgress", active),
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      {projects.length > 0 ? (
        <ul className="mt-zsd-xl grid gap-zsd-xl sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <li key={project.id}>
              <ProjectCard project={project} priority={i === 0} />
            </li>
          ))}
        </ul>
      ) : (
        <div
          data-testid="projects-empty"
          className="mt-zsd-xl flex flex-col items-center gap-zsd-md border border-zsd-outline-muted bg-zsd-surface-raised p-zsd-xl text-center"
        >
          <div aria-hidden="true" className="flex gap-zsd-xs">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-3 rotate-45 bg-zsd-outline-muted" />
            ))}
          </div>
          <h2 className="font-heading text-zsd-headline-sm text-zsd-on-surface">
            {t("projects.empty.title")}
          </h2>
          <p className="max-w-(--zsd-x-zsd-layout-prose-max) text-zsd-body-sm text-zsd-on-surface-muted">
            {t("projects.empty.text")}
          </p>
        </div>
      )}
    </div>
  )
}
