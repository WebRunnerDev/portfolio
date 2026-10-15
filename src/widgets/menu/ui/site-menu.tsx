import { lazy, Suspense } from "react"

import { useT } from "@/shared/i18n"

import { MenuButton } from "./menu-button"

const MenuDialog = lazy(() =>
  import("./menu-dialog").then((m) => ({ default: m.MenuDialog }))
)

// The dialog isn't on the first paint, so it loads lazily behind its trigger.
export function SiteMenu() {
  const t = useT()

  return (
    <Suspense fallback={<MenuButton label={t("header.menu")} disabled />}>
      <MenuDialog />
    </Suspense>
  )
}
