import { lazy, Suspense } from "react"

import { useT } from "@/shared/i18n"
import { Logo } from "@/shared/ui/logo"

import { MenuButton } from "./menu-button"

const SiteMenu = lazy(() =>
  import("./site-menu").then((m) => ({ default: m.SiteMenu }))
)

// Logo at the inline start, menu at the inline end: they swap sides in RTL.
// The logo lockup itself is never mirrored (ADR-0007), hence `dir="ltr"`.
export function SiteHeader() {
  const t = useT()

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-(--zsd-x-zsd-layout-header-height) max-w-(--zsd-x-zsd-layout-content-max) items-center gap-zsd-lg px-zsd-lg md:px-zsd-xxl">
        <div
          dir="ltr"
          data-testid="brand"
          className="flex items-center gap-zsd-sm"
        >
          <Logo className="size-6 shrink-0" />
          <span className="font-heading text-zsd-headline-sm">WebRunner</span>
        </div>
        <div className="ms-auto">
          <Suspense fallback={<MenuButton label={t("header.menu")} disabled />}>
            <SiteMenu />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
