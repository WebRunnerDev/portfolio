import { createFileRoute } from "@tanstack/react-router"

import { CvPage, loadCv } from "@/pages/cv"
import { PageError, PagePending } from "@/shared/ui/page-state"

export const Route = createFileRoute("/$lang/cv")({
  loader: ({ params, abortController }) =>
    loadCv(params.lang, abortController.signal),
  pendingComponent: () => <PagePending title="nav.cv" />,
  errorComponent: () => <PageError title="nav.cv" />,
  component: CvPage,
})
