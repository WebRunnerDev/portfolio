import { createFileRoute } from "@tanstack/react-router"

import { AdminLayout } from "@/pages/admin"

// ADR-0004: outside `/$lang`, behind Cloudflare Access. Only `component`
// here: the router splits it into its own chunk, so the admin's code never
// loads on the public pages.
export const Route = createFileRoute("/admin")({
  component: AdminLayout,
})
