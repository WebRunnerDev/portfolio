import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react"

import { useT, type MessageKey } from "@/shared/i18n"
import { cn } from "@/shared/lib/utils"
import { isTheme, THEMES, useTheme, type Theme } from "@/shared/lib/theme"
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/kit"

const OPTIONS: Record<Theme, { icon: LucideIcon; label: MessageKey }> = {
  light: { icon: Sun, label: "themeSwitcher.light" },
  dark: { icon: Moon, label: "themeSwitcher.dark" },
  system: { icon: Monitor, label: "themeSwitcher.system" },
}

// A radio group: Tab reaches the checked option, arrows move between them.
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const t = useT()

  return (
    <ToggleGroup
      type="single"
      value={theme}
      // Radix sends "" when the checked item is pressed again; keep the theme.
      onValueChange={(value) => isTheme(value) && setTheme(value)}
      aria-label={t("themeSwitcher.label")}
      spacing={0}
      className={cn("rounded-none border border-zsd-outline", className)}
    >
      {THEMES.map((value) => {
        const { icon: Icon, label } = OPTIONS[value]
        return (
          <ToggleGroupItem
            key={value}
            value={value}
            aria-label={t(label)}
            title={t(label)}
            className={cn(
              "size-zsd-control-height rounded-none! text-zsd-on-surface-muted hover:bg-transparent hover:text-zsd-on-surface",
              "outline-offset-[-2px] focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-ring",
              "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-(--zsd-x-zsd-motion-easing-standard) motion-reduce:transition-none",
              "data-[state=on]:bg-transparent data-[state=on]:text-zsd-primary-text data-[state=on]:shadow-[inset_0_-2px_0_var(--zsd-colors-primary)]"
            )}
          >
            <Icon aria-hidden />
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
