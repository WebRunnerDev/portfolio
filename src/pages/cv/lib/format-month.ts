import type { Lang } from "@contracts/lang"
import { formatDate } from "@/shared/i18n"

// A `YYYY-MM` month of the CV as "Jan 2024" on the Lang (Western digits on
// `ar`, shared/i18n/format.ts).
export function formatMonth(month: string, lang: Lang): string {
  const [year, index] = month.split("-").map(Number)
  return formatDate(Date.UTC(year, index - 1), lang, {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}
