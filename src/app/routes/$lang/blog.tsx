import { createFileRoute } from "@tanstack/react-router"

import { BlogPage, loadPosts, parseTagSearch } from "@/pages/blog"
import { PageError, PagePending } from "@/shared/ui/page-state"

// `?tag=<slug>` filters the list; the API answers an unknown Tag with none.
export const Route = createFileRoute("/$lang/blog")({
  validateSearch: parseTagSearch,
  loaderDeps: ({ search }) => ({ tag: search.tag }),
  loader: ({ params, deps, abortController }) =>
    loadPosts(params.lang, deps.tag, abortController.signal),
  pendingComponent: () => <PagePending title="nav.blog" />,
  errorComponent: () => <PageError title="nav.blog" />,
  component: BlogPage,
})
