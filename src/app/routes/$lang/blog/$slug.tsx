import { createFileRoute } from "@tanstack/react-router"

import { PostPage, loadPost } from "@/pages/blog"
import { NotFoundPage } from "@/pages/not-found"
import { PageError, PagePending } from "@/shared/ui/page-state"

// An unknown slug (or a draft) throws notFound().
export const Route = createFileRoute("/$lang/blog/$slug")({
  loader: ({ params, abortController }) =>
    loadPost(params.lang, params.slug, abortController.signal),
  pendingComponent: () => <PagePending />,
  errorComponent: () => <PageError title="nav.blog" />,
  notFoundComponent: NotFoundPage,
  component: PostPage,
})
