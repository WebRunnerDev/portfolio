import { createFileRoute } from "@tanstack/react-router"

import { AlbumPage, loadAlbum } from "@/pages/album"
import { NotFoundPage } from "@/pages/not-found"
import { PageError, PagePending } from "@/shared/ui/page-state"

// An unknown slug throws notFound().
export const Route = createFileRoute("/$lang/gallery/$slug")({
  loader: ({ params, abortController }) =>
    loadAlbum(params.lang, params.slug, abortController.signal),
  pendingComponent: () => <PagePending />,
  errorComponent: () => <PageError title="nav.gallery" />,
  notFoundComponent: NotFoundPage,
  component: AlbumPage,
})
