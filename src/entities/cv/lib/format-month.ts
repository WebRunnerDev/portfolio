import type { Lang } from "@contracts/lang"
import { formatDate } from "@/shared/i18n"

// A `YYYY-MM` month of the CV as "Jan 2024" on the Lang (Western digits on
// `ar`, shared/i18n/format.ts).
export function formatMonth(month: string, lang: Lang): string {
  const [year, index] = month.split("-").map(Number)
  // Chromium has no Kazakh month names ("2025 M11"), headless or not.
  if (lang === "kk") return `${KK_MONTHS[index - 1]} ${year}`
  return formatDate(Date.UTC(year, index - 1), lang, {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

const KK_MONTHS = [
  "қаң.",
  "ақп.",
  "нау.",
  "сәу.",
  "мам.",
  "мау.",
  "шіл.",
  "там.",
  "қыр.",
  "қаз.",
  "қар.",
  "жел.",
]
