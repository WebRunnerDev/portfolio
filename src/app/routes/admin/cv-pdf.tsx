import { createFileRoute } from "@tanstack/react-router"

import { CvPdfPage } from "@/pages/admin"

export const Route = createFileRoute("/admin/cv-pdf")({
  component: CvPdfPage,
})
