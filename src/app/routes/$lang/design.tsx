import { createFileRoute } from "@tanstack/react-router"

import { DesignPage } from "@/pages/design"

export const Route = createFileRoute("/$lang/design")({
  component: DesignPage,
})
