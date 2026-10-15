import { createFileRoute, redirect } from "@tanstack/react-router"

import { pickLang } from "@contracts/lang"

// `/` → the Lang from the cookie, then the browser languages, then EN.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const lang = pickLang({
      cookie: document.cookie,
      acceptLanguage: navigator.languages.join(","),
    })
    throw redirect({ to: "/$lang", params: { lang }, replace: true })
  },
})
