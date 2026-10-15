import { LangSwitcher } from "@/features/lang-switcher"
import { useT } from "@/shared/i18n"

export function HomePage() {
  const t = useT()

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-zsd-lg p-6">
      <h1 className="text-2xl font-medium">WebRunner</h1>
      <p className="text-zsd-on-surface-muted">{t("home.tagline")}</p>
      <LangSwitcher />
    </main>
  )
}
