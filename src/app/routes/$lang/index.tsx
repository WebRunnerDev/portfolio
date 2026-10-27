import { createFileRoute } from "@tanstack/react-router"

import { HomePage, loadHome } from "@/pages/home"

export const Route = createFileRoute("/$lang/")({
  loader: ({ params, abortController }) =>
    loadHome(params.lang, abortController.signal),
  component: HomePage,
})
