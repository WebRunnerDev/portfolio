import { getRouteApi } from "@tanstack/react-router"

import { ProjectStatus } from "@/entities/project"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"
import { PageStub } from "@/shared/ui/page-stub"

const route = getRouteApi("/$lang/projects/$slug")

// The project's header data; the Case Study and its Markdown land with #70.
export function ProjectPage() {
  const project = route.useLoaderData()

  return (
    <PageStub title={project.title}>
      <ProjectStatus status={project.status} />
      <FallbackNotice fallback={project.fallback} className="mt-zsd-md" />
      <p lang={fallbackLang(project)} className="mt-zsd-xs">
        {project.description}
      </p>
    </PageStub>
  )
}
