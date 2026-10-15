import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"

import { useLang, useT } from "@/shared/i18n"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/kit"

import { MenuButton } from "./menu-button"

// Loaded lazily by SiteHeader: the menu content isn't on the first paint.
export function SiteMenu() {
  const lang = useLang()
  const t = useT()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <MenuButton label={t("header.menu")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        <DropdownMenuItem asChild>
          <Link to="/$lang/design" params={{ lang }}>
            {t("header.design")}
            {/* Points along the reading direction, so it flips in RTL. */}
            <ArrowRight aria-hidden className="ms-auto rtl:rotate-180" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
