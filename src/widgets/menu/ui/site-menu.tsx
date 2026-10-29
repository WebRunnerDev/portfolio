import { useIntentImport } from "@/shared/lib/intent"
import { useT } from "@/shared/i18n"

import { MenuButton } from "./menu-button"

const loadMenu = () => import("./menu-dialog")

// The dialog isn't on the first paint: it loads when the visitor reaches for
// the menu button (#142), which stands in for its trigger until then.
export function SiteMenu() {
  const t = useT()
  const { loaded, triggerProps } = useIntentImport(loadMenu)

  if (!loaded) {
    return <MenuButton label={t("header.menu")} {...triggerProps} />
  }
  const { MenuDialog } = loaded.module
  return <MenuDialog defaultOpen={loaded.open} />
}
