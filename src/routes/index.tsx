import { createFileRoute, redirect } from "@tanstack/react-router"

// Placeholder until i18n lands (#5): Accept-Language / cookie detection goes here.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/$lang", params: { lang: "en" } })
  },
})
