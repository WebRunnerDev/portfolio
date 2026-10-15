import { createFileRoute } from "@tanstack/react-router"

import { ContactsPage } from "@/pages/contacts"

export const Route = createFileRoute("/$lang/contacts")({
  component: ContactsPage,
})
