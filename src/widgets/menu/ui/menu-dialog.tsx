import { useId, useRef, useState, type CSSProperties } from "react"
import { Link } from "@tanstack/react-router"

import { LangSwitcher } from "@/features/lang-switcher"
import { ThemeSwitcher } from "@/features/theme-switcher"
import { isHome, SECTIONS } from "@/shared/config"
import { useLang, useT } from "@/shared/i18n"
import { BarButton } from "@/shared/ui/bar-button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/kit"
import { BrandLockup } from "@/shared/ui/logo"

import { FOLD_END, rowDelay } from "../lib/choreography"
import { useMenuPanel } from "../lib/use-panel"
import { CrossIcon, MenuButton } from "./menu-button"
import { MenuTiles } from "./menu-tiles"

// A row rises from under its mask after the tiles (`menu-row-in`,
// index.css) and drops at once on close; the link itself stays in place, so a
// click lands during the animation.
const row = (i: number) =>
  ({ "--menu-delay": `${rowDelay(i)}s` }) as CSSProperties
const ROW = "menu-row-in group-data-[state=closed]/menu:menu-row-out"

// The panel hangs from the header's bottom border.
const UNDER_HEADER =
  "calc(var(--zsd-x-zsd-layout-header-height) + var(--zsd-x-zsd-border-width-default))"

// The menu (DESIGN.md › Menu): full screen below `lg`, a panel of section
// blocks under the header from it. Full screen, Radix traps focus and locks
// the page; the panel is non-modal, as the Lang menu is: the page keeps its
// scroll and a click on it closes the panel. Both close on Esc, return focus
// to the trigger, and stay mounted until the surface has faded (`menu-out`
// waits for the tiles, FOLD_END). No scrollbar of its own: five sections
// fit, and a short screen still scrolls without one.
// `defaultOpen`: the stand-in trigger was clicked while this loaded.
export function MenuDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const panel = useMenuPanel()
  const slot = useRef<HTMLSpanElement>(null)
  const id = useId()
  const lang = useLang()
  const t = useT()

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={!panel}>
      <DialogTrigger asChild>
        <MenuButton
          label={open ? t("header.close") : t("header.menu")}
          open={open}
        />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        style={
          {
            "--menu-fold-end": `${FOLD_END}s`,
            "--menu-header": UNDER_HEADER,
          } as CSSProperties
        }
        className="group/menu inset-0 flex size-full max-w-none translate-0 [scrollbar-width:none] flex-col gap-0 overflow-y-auto rounded-none bg-zsd-surface p-0 text-zsd-on-surface ring-0 sm:max-w-none lg:top-(--menu-header) lg:bottom-auto lg:h-auto lg:overflow-visible lg:border-b lg:border-border lg:bg-zsd-surface-raised rtl:translate-0 data-open:menu-in! data-closed:menu-out!"
      >
        <DialogTitle className="sr-only">{t("header.menu")}</DialogTitle>
        {/* Same bar as the header, so the close button replaces the trigger
            and the tiles leave from where the header logo is. From `lg` the
            header stays in view: the bar only marks that place, unseen, a
            header's height above the panel (not `fixed`: the panel's
            `translate` makes it the box of fixed children). */}
        <div className="border-b border-border lg:invisible lg:absolute lg:inset-x-0 lg:-top-(--menu-header)">
          <div className="mx-auto flex h-(--zsd-x-zsd-layout-header-height) w-full max-w-(--zsd-x-zsd-layout-content-max) items-center gap-zsd-md px-zsd-lg md:px-zsd-xxl">
            <BrandLockup
              logo={<span ref={slot} className="size-6 shrink-0" />}
            />
            <DialogClose asChild>
              <BarButton
                square
                aria-label={t("header.close")}
                title={t("header.close")}
                className="ms-auto -me-zsd-sm"
              >
                <span className="max-sm:hidden">{t("header.close")}</span>
                <CrossIcon />
              </BarButton>
            </DialogClose>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-(--zsd-x-zsd-layout-content-max) flex-1 flex-col gap-zsd-xl px-zsd-lg py-zsd-xl md:px-zsd-xxl">
          <nav aria-label={t("nav.label")}>
            {/* A list of rows; from `lg` a row of blocks, hairlines between,
                the current one under a rust rule along its top. */}
            <ul className="flex flex-col lg:grid lg:grid-cols-5">
              {SECTIONS.map((section, i) => (
                <li
                  key={section.to}
                  className="lg:border-e lg:border-zsd-outline-muted lg:first:border-s"
                >
                  {/* From `lg` a block reads number, title, description, the
                      titles in line. Hover and focus: a rust tile at the
                      start (from `lg`, in the block's top corner), the text
                      a step along the reading direction (card hover, #111). */}
                  <Link
                    to={section.to}
                    params={{ lang }}
                    activeOptions={{ exact: isHome(section) }}
                    onClick={() => setOpen(false)}
                    aria-describedby={`${id}-${i}`}
                    className="group/link relative flex min-h-zsd-control-height items-center gap-zsd-sm border-s-2 border-transparent ps-zsd-md font-heading text-zsd-headline-md break-words text-zsd-on-surface-muted outline-offset-2 transition-colors hover:text-zsd-on-surface focus-visible:text-zsd-on-surface focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:border-zsd-primary aria-[current=page]:text-zsd-primary-text motion-reduce:transition-none md:text-zsd-headline-lg lg:h-full lg:min-h-48 lg:flex-col lg:items-stretch lg:gap-zsd-xl lg:border-s-0 lg:border-t-2 lg:p-zsd-lg lg:text-zsd-headline-md lg:hover:bg-zsd-surface lg:focus-visible:bg-zsd-surface"
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 scale-50 rotate-45 bg-zsd-primary opacity-0 transition group-hover/link:scale-100 group-hover/link:opacity-100 group-focus-visible/link:scale-100 group-focus-visible/link:opacity-100 motion-reduce:transition-none lg:absolute lg:inset-e-zsd-lg lg:top-zsd-lg"
                    />
                    <span
                      aria-hidden
                      className="font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted max-lg:hidden"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="-my-[0.15em] min-w-0 overflow-hidden py-[0.15em] transition-transform group-hover/link:translate-x-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none rtl:group-hover/link:-translate-x-1 rtl:group-focus-visible/link:-translate-x-1">
                      <span style={row(i)} className={`block ${ROW}`}>
                        {t(section.label)}
                        {/* Out of the link's name, which stays the section's:
                            read as its description. */}
                        <span
                          id={`${id}-${i}`}
                          aria-hidden
                          className="mt-zsd-sm block font-zsd-body-sm text-zsd-body-sm text-zsd-on-surface-muted max-lg:hidden"
                        >
                          {t(section.description)}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {/* The header shows these from `lg`; below it they live here, the
              codes' text in line with the links'. */}
          <div
            style={row(SECTIONS.length)}
            className={`flex flex-wrap items-center gap-zsd-lg ps-zsd-md lg:hidden ${ROW}`}
          >
            <LangSwitcher />
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
