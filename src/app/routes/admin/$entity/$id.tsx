import { createFileRoute } from "@tanstack/react-router"

import { EntityEditorPage } from "@/pages/admin"

export const Route = createFileRoute("/admin/$entity/$id")({
  component: EntityEditorPage,
})
