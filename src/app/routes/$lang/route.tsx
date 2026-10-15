import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { DEFAULT_LANG, isLang, withLang } from "@contracts/lang"
import { LangHead } from "@/shared/i18n"

// Every page lives under a Lang; an unknown one redirects to EN, same path.
export const Route = createFileRoute("/$lang")({
  beforeLoad: ({ params, location }) => {
    if (!isLang(params.lang)) {
      throw redirect({
        href: withLang(location.pathname, DEFAULT_LANG) + location.searchStr,
        replace: true,
      })
    }
  },
  component: () => (
    <>
      <LangHead />
      <Outlet />
    </>
  ),
})
