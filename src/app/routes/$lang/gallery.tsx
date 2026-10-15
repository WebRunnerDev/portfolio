import { createFileRoute } from "@tanstack/react-router"

import { GalleryPage } from "@/pages/gallery"

export const Route = createFileRoute("/$lang/gallery")({
  component: GalleryPage,
})
