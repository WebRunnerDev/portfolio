import { createFileRoute } from "@tanstack/react-router"

import { AlbumPage, loadAlbum, parsePhotoSearch } from "@/pages/album"
import { NotFoundPage } from "@/pages/not-found"
import { PageError, PagePending } from "@/shared/ui/page-state"

// An unknown slug throws notFound(). `?photo=<id>` opens the Lightbox.
export const Route = createFileRoute("/$lang/gallery/$slug")({
  validateSearch: parsePhotoSearch,
  loader: ({ params, abortController }) =>
    loadAlbum(params.lang, params.slug, abortController.signal),
  pendingComponent: () => <PagePending />,
  errorComponent: () => <PageError title="nav.gallery" />,
  notFoundComponent: NotFoundPage,
  component: AlbumPage,
})
