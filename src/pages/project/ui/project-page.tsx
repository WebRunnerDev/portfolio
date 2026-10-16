import { getRouteApi } from "@tanstack/react-router"

import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"
import { PageStub } from "@/shared/ui/page-stub"

const route = getRouteApi("/$lang/projects/$slug")

// The project's header data; the Case Study and its Markdown land with #70.
export function ProjectPage() {
  const project = route.useLoaderData()

  return (
    <PageStub title={project.title}>
      <FallbackNotice fallback={project.fallback} />
      <p lang={fallbackLang(project)} className="mt-zsd-xs">
        {project.description}
      </p>
    </PageStub>
  )
}
