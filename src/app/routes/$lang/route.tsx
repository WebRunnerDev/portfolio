import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { isLang, pickLang, withLang, type Lang } from "@contracts/lang"
import { DirectionProvider } from "@/app/providers"
import { NotFoundPage } from "@/pages/not-found"
import { LangHead } from "@/shared/i18n"
import { useWeightedScroll } from "@/shared/lib/weighted-scroll"
import { CursorTile } from "@/widgets/cursor-tile"
import { SiteFooter } from "@/widgets/footer"
import { SiteHeader } from "@/widgets/header"
import { SiteMenu } from "@/widgets/menu"
import { MusicPlayer } from "@/widgets/music-player"

// Every page lives under a Lang; a path without one redirects to the same
// path on the visitor's Lang, picked as for `/` (the Worker does the same,
// worker/README.md › Pages without a Lang). An unknown path under a Lang
// renders NotFoundPage inside the layout.
export const Route = createFileRoute("/$lang")({
  // Only types `lang` for the loaders below: beforeLoad redirects any other.
  params: { parse: ({ lang }) => ({ lang: lang as Lang }) },
  beforeLoad: ({ params, location }) => {
    if (!isLang(params.lang)) {
      const lang = pickLang({
        cookie: document.cookie,
        acceptLanguage: navigator.languages.join(","),
      })
      throw redirect({
        href: withLang(location.pathname, lang) + location.searchStr,
        replace: true,
      })
    }
  },
  // The weighted scroll (ADR-0014) on every page of the layout.
  component: function Layout() {
    useWeightedScroll()
    return (
      <DirectionProvider>
        <LangHead />
        <div className="flex min-h-svh flex-col">
          <SiteHeader menu={<SiteMenu />} />
          <main id="main" tabIndex={-1} className="flex flex-1 flex-col">
            <Outlet />
          </main>
          <SiteFooter />
        </div>
        {/* Outside the <Outlet>: the music goes on across page changes. */}
        <MusicPlayer />
        <CursorTile />
      </DirectionProvider>
    )
  },
  notFoundComponent: NotFoundPage,
})
