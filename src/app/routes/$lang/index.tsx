import { createFileRoute } from "@tanstack/react-router"

import { HomePage } from "@/pages/home"

export const Route = createFileRoute("/$lang/")({
  component: HomePage,
})
