import { useRef, useState, type CSSProperties } from "react"
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

import { FOLD_END, rowDelay } from "../lib/choreography"
import { BAR_BUTTON, MenuButton } from "./menu-button"
import { MenuTiles } from "./menu-tiles"

// A row rises from under its mask after the tiles (`menu-row-in`,
// index.css) and drops at once on close; the link itself stays in place, so a
// click lands during the animation.
const row = (i: number) =>
  ({ "--menu-delay": `${rowDelay(i)}s` }) as CSSProperties
const ROW = "menu-row-in group-data-[state=closed]/menu:menu-row-out"

// Full-screen menu at all widths (DESIGN.md). Radix traps focus, closes on
// Esc and returns focus to the trigger; it keeps the menu mounted until the
// surface has faded (`menu-out` waits for the tiles, FOLD_END).
// `defaultOpen`: the stand-in trigger was clicked while this loaded.
export function MenuDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const slot = useRef<HTMLSpanElement>(null)
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
        style={{ "--menu-fold-end": `${FOLD_END}s` } as CSSProperties}
        className="group/menu inset-0 flex size-full max-w-none translate-0 flex-col gap-0 overflow-y-auto rounded-none bg-zsd-surface p-0 text-zsd-on-surface ring-0 sm:max-w-none rtl:translate-0 data-open:menu-in! data-closed:menu-out!"
      >
        <DialogTitle className="sr-only">{t("header.menu")}</DialogTitle>
        {/* Same bar as the header, so the close button replaces the trigger
            and the tiles leave from where the header logo is. */}
        <div className="border-b border-border">
          <div className="mx-auto flex h-(--zsd-x-zsd-layout-header-height) w-full max-w-(--zsd-x-zsd-layout-content-max) items-center gap-zsd-md px-zsd-lg md:px-zsd-xxl">
            <BrandLockup
              logo={<span ref={slot} className="size-6 shrink-0" />}
            />
            <DialogClose asChild>
              <Button
                variant="outline"
                aria-label={t("header.close")}
                title={t("header.close")}
                className={`ms-auto ${BAR_BUTTON}`}
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
              {SECTIONS.map((section, i) => (
                <li key={section.to}>
                  {/* Hover and focus: a rust tile at the start, the text a
                      step along the reading direction (card hover, #111). */}
                  <Link
                    to={section.to}
                    params={{ lang }}
                    activeOptions={{ exact: isHome(section) }}
                    onClick={() => setOpen(false)}
                    className="group/link flex min-h-zsd-control-height items-center gap-zsd-sm border-s-2 border-transparent ps-zsd-md font-heading text-zsd-headline-md break-words text-zsd-on-surface-muted outline-offset-2 transition-colors hover:text-zsd-on-surface focus-visible:text-zsd-on-surface focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:border-zsd-primary aria-[current=page]:text-zsd-primary-text motion-reduce:transition-none md:text-zsd-headline-lg"
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 scale-50 rotate-45 bg-zsd-primary opacity-0 transition group-hover/link:scale-100 group-hover/link:opacity-100 group-focus-visible/link:scale-100 group-focus-visible/link:opacity-100 motion-reduce:transition-none"
                    />
                    <span className="-my-[0.15em] min-w-0 overflow-hidden py-[0.15em] transition-transform group-hover/link:translate-x-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none rtl:group-hover/link:-translate-x-1 rtl:group-focus-visible/link:-translate-x-1">
                      <span style={row(i)} className={`block ${ROW}`}>
                        {t(section.label)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {/* The header shows these from `lg`; below it they live here. */}
          <div
            style={row(SECTIONS.length)}
            className={`flex flex-wrap items-center gap-zsd-lg lg:hidden ${ROW}`}
          >
            <LangSwitcher className="flex-wrap" />
            <ThemeSwitcher />
          </div>
        </div>
        {/* After the bar, so its slot is there when the tiles measure it;
            under the content all the same. */}
        <MenuTiles open={open} slot={slot} />
      </DialogContent>
    </Dialog>
  )
}
