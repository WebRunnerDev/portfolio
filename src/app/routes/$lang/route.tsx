import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { DEFAULT_LANG, isLang, withLang } from "@contracts/lang"
import { DirectionProvider } from "@/app/providers"
import { NotFoundPage } from "@/pages/not-found"
import { LangHead } from "@/shared/i18n"
import { SiteFooter } from "@/widgets/footer"
import { SiteHeader } from "@/widgets/header"
import { SiteMenu } from "@/widgets/menu"

// Every page lives under a Lang; an unknown one redirects to EN, same path.
// An unknown path under a Lang renders NotFoundPage inside the layout.
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
    <DirectionProvider>
      <LangHead />
      <div className="flex min-h-svh flex-col">
        <SiteHeader menu={<SiteMenu />} />
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </DirectionProvider>
  ),
  notFoundComponent: NotFoundPage,
})
