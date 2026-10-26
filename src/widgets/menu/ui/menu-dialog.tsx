import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { X } from "lucide-react"

import { LangSwitcher } from "@/features/lang-switcher"
import { ThemeSwitcher } from "@/features/theme-switcher"
import { isHome, SECTIONS } from "@/shared/config"
import { useLang, useT } from "@/shared/i18n"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/kit"
import { BrandLockup } from "@/shared/ui/logo"

import { MenuButton } from "./menu-button"

// Full-screen menu at all widths (DESIGN.md). Radix traps focus, closes on
// Esc and returns focus to the trigger. The rhombus animation comes in stage 6.
export function MenuDialog() {
  const [open, setOpen] = useState(false)
  const lang = useLang()
  const t = useT()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <MenuButton label={t("header.menu")} />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="inset-0 flex size-full max-w-none translate-0 flex-col gap-0 overflow-y-auto rounded-none bg-zsd-surface p-0 text-zsd-on-surface ring-0 duration-(--zsd-x-zsd-motion-duration-base) ease-zsd-enter motion-reduce:animate-none sm:max-w-none rtl:translate-0 data-open:zoom-in-100 data-closed:ease-zsd-exit data-closed:zoom-out-100"
      >
        <DialogTitle className="sr-only">{t("header.menu")}</DialogTitle>
        {/* Same bar as the header, so the close button replaces the trigger. */}
        <div className="border-b border-border">
          <div className="mx-auto flex h-(--zsd-x-zsd-layout-header-height) w-full max-w-(--zsd-x-zsd-layout-content-max) items-center gap-zsd-md px-zsd-lg md:px-zsd-xxl">
            <BrandLockup />
            <DialogClose asChild>
              <Button
                variant="ghost"
                aria-label={t("header.close")}
                title={t("header.close")}
                className="ms-auto"
              >
                <X aria-hidden />
                <span className="max-sm:hidden">{t("header.close")}</span>
              </Button>
            </DialogClose>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-(--zsd-x-zsd-layout-content-max) flex-1 flex-col gap-zsd-xl px-zsd-lg py-zsd-xl md:px-zsd-xxl">
          <nav aria-label={t("nav.label")}>
            <ul className="flex flex-col">
              {SECTIONS.map((section) => (
                <li key={section.to}>
                  <Link
                    to={section.to}
                    params={{ lang }}
                    activeOptions={{ exact: isHome(section) }}
                    onClick={() => setOpen(false)}
                    className="flex min-h-zsd-control-height items-center border-s-2 border-transparent ps-zsd-md font-heading text-zsd-headline-md break-words text-zsd-on-surface-muted outline-offset-2 transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover hover:text-zsd-on-surface focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:border-zsd-primary aria-[current=page]:text-zsd-primary-text motion-reduce:transition-none md:text-zsd-headline-lg"
                  >
                    {t(section.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {/* The header shows these from `lg`; below it they live here. */}
          <div className="flex flex-wrap items-center gap-zsd-lg lg:hidden">
            <LangSwitcher className="flex-wrap" />
            <ThemeSwitcher />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
