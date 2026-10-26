import { Link } from "@tanstack/react-router"

import { LANGS, type Lang } from "@contracts/lang"
import { useLang, useT } from "@/shared/i18n"
import { cn } from "@/shared/lib/utils"

import { rememberLang } from "../model/remember-lang"

// Endonyms: each Lang is named in itself, whatever the current Lang is.
const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  ru: "Русский",
  kk: "Қазақша",
  es: "Español",
  de: "Deutsch",
  ar: "العربية",
}

// Links to the current page in every Lang; path, search and hash are kept.
export function LangSwitcher({ className }: { className?: string }) {
  const lang = useLang()
  const t = useT()

  return (
    <nav aria-label={t("langSwitcher.label")} className={cn("flex", className)}>
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
          aria-label={LANG_NAMES[l]}
          aria-current={l === lang ? "page" : undefined}
          onClick={() => rememberLang(l)}
          className={cn(
            "flex h-zsd-control-height min-w-zsd-control-height items-center justify-center px-zsd-sm font-zsd-label-mono text-zsd-label-mono uppercase",
            "outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-ring",
            "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none",
            l === lang
              ? "text-zsd-primary-text shadow-[inset_0_-2px_0_var(--zsd-colors-primary)]"
              : "text-zsd-on-surface-muted hover:text-zsd-on-surface"
          )}
        >
          {l}
        </Link>
      ))}
    </nav>
  )
}
