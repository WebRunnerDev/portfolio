import type { Technology } from "@contracts/api/public"
import type { MessageKey } from "@/shared/i18n"

export const TECH_CATEGORIES: Record<Technology["category"], MessageKey> = {
  frontend: "cv.tech.frontend",
  backend_cloud: "cv.tech.backend_cloud",
  qa_testing: "cv.tech.qa_testing",
  tools_design: "cv.tech.tools_design",
}

// The directory by category, categories and technologies in the API's order.
export function groupByCategory(items: Technology[]) {
  const groups = new Map<Technology["category"], Technology[]>()
  for (const tech of items) {
    groups.set(tech.category, [...(groups.get(tech.category) ?? []), tech])
  }
  return [...groups]
}
