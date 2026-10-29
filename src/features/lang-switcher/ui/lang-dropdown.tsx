import type { CSSProperties } from "react"
import { Link } from "@tanstack/react-router"

import { LANGS } from "@contracts/lang"
import { useLang } from "@/shared/i18n"
import { STAGGER } from "@/shared/lib/motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/kit"

import { LANG_NAMES } from "../model/lang-names"
import { rememberLang } from "../model/remember-lang"
import { LangTrigger } from "./lang-trigger"

// The trigger is centred in the 56px bar; this puts the menu's top edge right
// under the header's border, so the menu hangs from it.
const UNDER_HEADER = 7

const row = (i: number) =>
  ({ "--lang-delay": `${i * STAGGER.word}s` }) as CSSProperties

// The header's Lang menu: every Lang by its endonym, the current one marked by
// a rust tile. Links to the current page, path, search and hash kept, as in
// `LangSwitcher`. Rows never move, only their text, so a click lands while
// they rise. `defaultOpen`: the stand-in trigger was clicked while this loaded.
export function LangDropdown({
  defaultOpen = false,
}: {
  defaultOpen?: boolean
}) {
  const lang = useLang()

  return (
    <DropdownMenu defaultOpen={defaultOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <LangTrigger />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={UNDER_HEADER}
        className="w-60! rounded-none border border-t-0 border-zsd-outline-muted bg-zsd-surface-raised p-0 py-zsd-xs text-zsd-on-surface shadow-none ring-0 data-open:lang-menu-in! data-closed:lang-menu-out!"
      >
        {LANGS.map((l, i) => (
          <DropdownMenuItem key={l} asChild>
            <Link
              to="."
              params={{ lang: l }}
              search={true}
              hash={true}
              hrefLang={l}
              lang={l}
              aria-current={l === lang ? "page" : undefined}
              onClick={() => rememberLang(l)}
              className="group/lang flex min-h-zsd-control-height items-center gap-zsd-md rounded-none px-zsd-lg py-0 text-zsd-on-surface-muted focus:bg-zsd-surface focus:text-zsd-on-surface aria-[current=page]:text-zsd-primary-text"
            >
              <span
                aria-hidden
                className="size-1.5 shrink-0 scale-0 rotate-45 bg-zsd-primary transition-transform group-focus/lang:scale-100 group-aria-[current=page]/lang:scale-100 motion-reduce:transition-none"
              />
              <span
                style={row(i)}
                className="flex min-w-0 flex-1 lang-row-in items-baseline justify-between gap-zsd-md"
              >
                <span
                  dir="auto"
                  className="font-zsd-label-md text-zsd-label-md"
                >
                  {LANG_NAMES[l]}
                </span>
                <span
                  aria-hidden
                  className="font-zsd-label-mono text-zsd-label-mono uppercase"
                >
                  {l}
                </span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
