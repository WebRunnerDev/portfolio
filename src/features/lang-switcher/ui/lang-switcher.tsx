import { Link } from "@tanstack/react-router"

import { LANGS } from "@contracts/lang"
import { useLang, useT } from "@/shared/i18n"
import { cn } from "@/shared/lib/utils"

import { LANG_NAMES } from "../model/lang-names"
import { rememberLang } from "../model/remember-lang"

// Links to the current page in every Lang; path, search and hash are kept.
// The name is the code shown plus the endonym, so it says what voice control
// users see (WCAG 2.5.3, label in name). A row of codes for the menu, the
// current one in rust after a tile; the header has `LangMenu`.
export function LangSwitcher({ className }: { className?: string }) {
  const lang = useLang()
  const t = useT()

  return (
    <nav
      aria-label={t("langSwitcher.label")}
      className={cn("flex h-zsd-control-height", className)}
    >
      {LANGS.map((l) => (
        <Link
          key={l}
          to="."
          params={{ lang: l }}
          search={true}
          hash={true}
          hrefLang={l}
          lang={l}
          title={LANG_NAMES[l]}
          aria-current={l === lang ? "page" : undefined}
          onClick={() => rememberLang(l)}
          className={cn(
            "flex h-full min-w-zsd-control-height items-center justify-center gap-zsd-xs px-zsd-sm font-zsd-label-mono text-zsd-label-mono uppercase",
            "outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-ring",
            "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none",
            l === lang
              ? "text-zsd-primary-text before:size-1.5 before:rotate-45 before:bg-zsd-primary"
              : "text-zsd-on-surface-muted hover:text-zsd-on-surface"
          )}
        >
          {l}
          <span className="sr-only"> {LANG_NAMES[l]}</span>
        </Link>
      ))}
    </nav>
  )
}
