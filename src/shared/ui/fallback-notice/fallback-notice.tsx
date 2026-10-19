import { Languages } from "lucide-react"
import { cn } from "cn"

import { useT } from "@/shared/i18n"

// CONTEXT.md › Fallback: an entity with `fallback: true` came with its EN
// Translation. Put the notice next to it, and `lang={fallbackLang(entity)}` on
// the element holding its text, so screen readers read it as English.
export function FallbackNotice({
  fallback,
  className,
}: {
  fallback: boolean
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
      {t("fallback.notice")}
    </p>
  )
}

export function fallbackLang(entity: { fallback: boolean }) {
  return entity.fallback ? "en" : undefined
}
