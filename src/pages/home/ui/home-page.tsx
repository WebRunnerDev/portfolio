import { useT } from "@/shared/i18n"

export function HomePage() {
  const t = useT()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-zsd-lg p-6">
      <h1 className="text-2xl font-medium">WebRunner</h1>
      <p className="text-zsd-on-surface-muted">{t("home.tagline")}</p>
    </div>
  )
}
