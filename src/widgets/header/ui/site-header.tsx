import type { ReactNode } from "react"
import { Link, useMatchRoute } from "@tanstack/react-router"

import { LangSwitcher } from "@/features/lang-switcher"
import { ThemeSwitcher } from "@/features/theme-switcher"
import { isHome, SECTIONS } from "@/shared/config"
import { useLang, useT } from "@/shared/i18n"
import { BrandLockup } from "@/shared/ui/logo"

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"

// Brand, current section, Lang and mode controls, menu. Logical order, so the
// sides swap in RTL. Below `lg` the controls move into the menu to fit 360px.
// `menu` is a slot: the layout passes the menu widget in.
export function SiteHeader({ menu }: { menu: ReactNode }) {
  const lang = useLang()
  const t = useT()
  const matchRoute = useMatchRoute()
  const current = SECTIONS.find(
    (section) =>
      !isHome(section) && matchRoute({ to: section.to, fuzzy: true }) !== false
  )

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card [view-transition-name:site-header]">
      <a
        href="#main"
        className={`sr-only bg-zsd-surface px-zsd-md py-zsd-sm text-zsd-label-md focus:not-sr-only focus:absolute focus:inset-s-zsd-lg focus:top-zsd-sm focus:z-50 ${FOCUS_RING}`}
      >
        {t("header.skip")}
      </a>
      <div className="mx-auto flex h-(--zsd-x-zsd-layout-header-height) max-w-(--zsd-x-zsd-layout-content-max) items-center gap-zsd-md px-zsd-lg md:px-zsd-xxl">
        <Link
          to="/$lang"
          params={{ lang }}
          aria-label={`WebRunner, ${t("nav.home")}`}
          className={`shrink-0 ${FOCUS_RING}`}
        >
          <BrandLockup />
        </Link>
        {current && (
          <span
            data-testid="current-section"
            className="min-w-0 truncate border-s border-zsd-outline-muted ps-zsd-md font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase"
          >
            {t(current.label)}
          </span>
        )}
        <div className="ms-auto flex shrink-0 items-center gap-zsd-md">
          <LangSwitcher className="max-lg:hidden" />
          <ThemeSwitcher className="max-lg:hidden" />
          {menu}
        </div>
      </div>
    </header>
  )
}
