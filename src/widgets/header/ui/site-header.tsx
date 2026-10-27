import { useState, type CSSProperties, type ReactNode } from "react"
import { Link, useMatchRoute } from "@tanstack/react-router"

import { LangSwitcher } from "@/features/lang-switcher"
import { ThemeSwitcher } from "@/features/theme-switcher"
import { isHome, SECTIONS } from "@/shared/config"
import { useLang, useT } from "@/shared/i18n"
import { STAGGER } from "@/shared/lib/motion"
import { BrandLockup } from "@/shared/ui/logo"

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"

// The home page's load choreography (docs/design-brief.md): the controls
// arrive at 600 ms, `stagger-item` apart, after the brand.
const CONTROLS_START = 0.6
const control = (i: number) =>
  ({
    "--header-delay": `${CONTROLS_START + i * STAGGER.item}s`,
  }) as CSSProperties

// Brand, current section, Lang and mode controls, menu. Logical order, so the
// sides swap in RTL. Below `lg` the controls move into the menu to fit 320px.
// Sticky and always shown: it holds the only way to the menu. `menu` is a
// slot: the layout passes the menu widget in.
export function SiteHeader({ menu }: { menu: ReactNode }) {
  const lang = useLang()
  const t = useT()
  const matchRoute = useMatchRoute()
  const current = SECTIONS.find(
    (section) =>
      !isHome(section) && matchRoute({ to: section.to, fuzzy: true }) !== false
  )
  // The header stays mounted across pages, so this is the first page only;
  // other pages show only their title (docs/design-brief.md).
  const [intro] = useState(
    () => matchRoute({ to: "/$lang", params: { lang } }) !== false
  )
  const controlClass = intro ? "flex header-in" : "flex"

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-zsd-surface-raised [view-transition-name:site-header]">
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
            className="flex min-w-0 items-center gap-zsd-sm border-s border-zsd-outline-muted ps-zsd-md font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase"
          >
            <span
              aria-hidden
              className="size-1.5 shrink-0 rotate-45 bg-zsd-primary"
            />
            <span className="truncate">{t(current.label)}</span>
          </span>
        )}
        <div className="ms-auto flex shrink-0 items-center gap-zsd-md">
          <span style={control(0)} className={`max-lg:hidden ${controlClass}`}>
            <LangSwitcher />
          </span>
          <span style={control(1)} className={`max-lg:hidden ${controlClass}`}>
            <ThemeSwitcher />
          </span>
          <span style={control(2)} className={controlClass}>
            {menu}
          </span>
        </div>
      </div>
    </header>
  )
}
