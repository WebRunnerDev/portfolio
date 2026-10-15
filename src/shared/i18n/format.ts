import type { Lang } from "@contracts/lang"

// Intl locale for a Lang. Arabic keeps Western digits (plan.md, ADR-0007).
export function intlLocale(lang: Lang): string {
  return lang === "ar" ? "ar-u-nu-latn" : lang
}

export function formatDate(
  value: Date | number,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" }
): string {
  return new Intl.DateTimeFormat(intlLocale(lang), options).format(value)
}

export function formatNumber(
  value: number,
  lang: Lang,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(intlLocale(lang), options).format(value)
}
