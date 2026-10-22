import { Languages } from "lucide-react"
import { cn } from "cn"

import { langDirection, type Lang } from "@contracts/lang"
import { useT, type MessageKey } from "@/shared/i18n"

// CONTEXT.md › Fallback: an entity with `fallback: true` came with its EN
// Translation. Put the notice next to it, and `lang={fallbackLang(entity)}` on
// the element holding its text, so screen readers read it as English. `text`
// names the entity where the generic notice says too little (a post's page).
export function FallbackNotice({
  fallback,
  text = "fallback.notice",
  className,
}: {
  fallback: boolean
  text?: MessageKey
  className?: string
}) {
  const t = useT()
  if (!fallback) return null

  return (
    <p
      data-testid="fallback-notice"
      className={cn(
        "flex items-center gap-zsd-xs text-zsd-body-sm text-zsd-on-surface-muted",
        className
      )}
    >
      <Languages aria-hidden="true" className="size-4 shrink-0" />
      {t(text)}
    </p>
  )
}

export function fallbackLang(entity: { fallback: boolean }) {
  return entity.fallback ? "en" : undefined
}

// EN text on an RTL Lang reads left to right: for long text (a post's body)
// next to `lang={fallbackLang(entity)}`.
export function fallbackDir(entity: { fallback: boolean }, lang: Lang) {
  return entity.fallback && langDirection(lang) === "rtl" ? "ltr" : undefined
}
