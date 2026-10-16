import { createFileRoute } from "@tanstack/react-router"

import { NotFoundPage } from "@/pages/not-found"
import { ProjectPage, loadProject } from "@/pages/project"
import { PageError, PagePending } from "@/shared/ui/page-state"

// An unknown slug (or one without a Case Study) throws notFound().
export const Route = createFileRoute("/$lang/projects/$slug")({
  loader: ({ params, abortController }) =>
    loadProject(params.lang, params.slug, abortController.signal),
  pendingComponent: () => <PagePending />,
  errorComponent: () => <PageError title="nav.projects" />,
  notFoundComponent: NotFoundPage,
  component: ProjectPage,
})
