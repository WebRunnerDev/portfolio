import { createFileRoute } from "@tanstack/react-router"

import { ProjectsPage, loadProjects } from "@/pages/projects"
import { PageError, PagePending } from "@/shared/ui/page-state"

export const Route = createFileRoute("/$lang/projects/")({
  loader: ({ params, abortController }) =>
    loadProjects(params.lang, abortController.signal),
  pendingComponent: () => <PagePending title="nav.projects" />,
  errorComponent: () => <PageError title="nav.projects" />,
  component: ProjectsPage,
})
