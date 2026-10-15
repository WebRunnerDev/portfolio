import { createFileRoute } from "@tanstack/react-router"

import { BlogPage } from "@/pages/blog"

export const Route = createFileRoute("/$lang/blog")({
  component: BlogPage,
})
