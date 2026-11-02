import type { AdminRow } from "../api/admin-api"
import type { EntityConfig } from "../model/entities"

// The state of a page in one line, under its link on the Admin's home.

// "Projects" reads "projects" mid-sentence; "CV sections" stays.
function midSentence(label: string) {
  return /^.[a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label
}

export function rowsSummary(entity: EntityConfig, rows: AdminRow[]): string {
  if (entity.single) return rows.length > 0 ? "Filled in" : "Not created yet"
  if (rows.length === 0) return "None yet"
  const count = `${rows.length} ${rows.length === 1 ? entity.singular : midSentence(entity.label)}`
  if (!entity.publishable) return count
  const drafts = rows.filter((row) => row.status !== "published").length
  return drafts > 0
    ? `${count}, ${drafts} ${drafts === 1 ? "draft" : "drafts"}`
    : count
}

export function cvPdfSummary(pdfs: unknown[], langs: number): string {
  return pdfs.length > 0 ? `${pdfs.length} of ${langs} Langs` : "No PDF yet"
}
