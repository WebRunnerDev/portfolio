import { DEFAULT_LANG, LANGS, type Lang } from "@contracts/lang"

import type { AdminRow, Values } from "../api/admin-api"
import type { Column, EntityConfig } from "../model/entities"

// Reading rows of the admin API for the lists.

function translations(row: AdminRow) {
  return (row.translations ?? {}) as Partial<Record<Lang, Values>>
}

// The Langs the row has a Translation on, in LANGS order.
export function translatedLangs(row: AdminRow): Lang[] {
  const present = translations(row)
  return LANGS.filter((lang) => present[lang])
}

// A translated field on EN, else on the first Lang that has it.
function translatedValue(row: AdminRow, field: string) {
  const present = translations(row)
  for (const lang of [DEFAULT_LANG, ...LANGS]) {
    const value = present[lang]?.[field]
    if (value !== undefined && value !== null && value !== "") return value
  }
  return undefined
}

export function fieldValue(row: AdminRow, field: string, translated = false) {
  return translated ? translatedValue(row, field) : row[field]
}

export function rowTitle(entity: EntityConfig, row: AdminRow): string {
  for (const field of entity.titleFields) {
    const value =
      translatedValue(row, field) ?? (row[field] as string | undefined)
    if (value !== undefined && value !== null && value !== "") {
      return String(value)
    }
  }
  return `${entity.singular} #${row.id}`
}

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

// A column's value as text; "" when empty.
export function cellText(row: AdminRow, column: Column): string {
  const value = fieldValue(row, column.field, column.translated)
  switch (column.kind) {
    case "period":
      return `${row.startMonth ?? "?"} – ${row.endMonth ?? "present"}`
    case "date":
      return typeof value === "string" ? dateFormat.format(new Date(value)) : ""
    case "duration": {
      if (typeof value !== "number") return ""
      const seconds = String(value % 60).padStart(2, "0")
      return `${Math.floor(value / 60)}:${seconds}`
    }
    case "status":
      return typeof value === "string" ? value.replaceAll("_", " ") : ""
    default:
      return value === undefined || value === null ? "" : String(value)
  }
}
