import { createFileRoute } from "@tanstack/react-router"

import { GalleryPage, loadAlbums } from "@/pages/gallery"
import { PageError, PagePending } from "@/shared/ui/page-state"

export const Route = createFileRoute("/$lang/gallery/")({
  loader: ({ params, abortController }) =>
    loadAlbums(params.lang, abortController.signal),
  pendingComponent: () => <PagePending title="nav.gallery" />,
  errorComponent: () => <PageError title="nav.gallery" />,
  component: GalleryPage,
})
