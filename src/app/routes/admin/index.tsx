import { createFileRoute } from "@tanstack/react-router"

import { AdminHomePage } from "@/pages/admin"

export const Route = createFileRoute("/admin/")({
  component: AdminHomePage,
})
