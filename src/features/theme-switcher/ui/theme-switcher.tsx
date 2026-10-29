import { useT } from "@/shared/i18n"
import { useTheme } from "@/shared/lib/theme"
import { BarButton } from "@/shared/ui/bar-button"

// A logo tile, outlined, one half filled: light and dark on one rhombus. A
// switch turns it over (`easing-layout`), so the filled half changes side.
// Never mirrored.
function ModeIcon({ dark }: { dark: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={`size-5 transition-transform duration-(--zsd-x-zsd-motion-duration-slow) ease-zsd-layout motion-reduce:transition-none ${dark ? "rotate-180" : ""}`}
    >
      <path
        d="M10 2.5L17.5 10L10 17.5L2.5 10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M10 2.5L2.5 10L10 17.5Z" fill="currentColor" />
    </svg>
  )
}

// One toggle between light and dark, pressed in dark. A first visit follows
// the OS ("system" until the visitor picks one); the toggle shows what is on
// screen.
export function ThemeSwitcher({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useT()
  const dark = resolvedTheme === "dark"

  return (
    <BarButton
      icon
      aria-pressed={dark}
      aria-label={t("themeSwitcher.dark")}
      title={t(dark ? "themeSwitcher.light" : "themeSwitcher.dark")}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={className}
    >
      <ModeIcon dark={dark} />
    </BarButton>
  )
}
