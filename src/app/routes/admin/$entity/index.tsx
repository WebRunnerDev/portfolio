import { createFileRoute } from "@tanstack/react-router"

import { EntityListPage } from "@/pages/admin"

export const Route = createFileRoute("/admin/$entity/")({
  component: EntityListPage,
})
