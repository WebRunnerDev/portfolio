import { describe, expect, it } from "vitest"

import { findEntity } from "../model/entities"
import { cvPdfSummary, rowsSummary } from "./summary"

const rows = (...statuses: string[]) =>
  statuses.map((status, index) => ({ id: index + 1, status }))

describe("rowsSummary", () => {
  it("counts the rows", () => {
    const projects = findEntity("projects")!
    expect(rowsSummary(projects, [])).toBe("None yet")
    expect(rowsSummary(projects, rows("completed"))).toBe("1 project")
    expect(rowsSummary(projects, rows("completed", "archived"))).toBe(
      "2 projects"
    )
    expect(rowsSummary(findEntity("cv-sections")!, rows("", ""))).toBe(
      "2 CV sections"
    )
  })

  it("counts the drafts of what is published", () => {
    const posts = findEntity("posts")!
    expect(rowsSummary(posts, rows("published", "published"))).toBe("2 posts")
    expect(rowsSummary(posts, rows("published", "draft"))).toBe(
      "2 posts, 1 draft"
    )
    expect(rowsSummary(posts, rows("draft", "draft"))).toBe("2 posts, 2 drafts")
  })

  it("says whether the Profile exists", () => {
    const profile = findEntity("profile")!
    expect(rowsSummary(profile, [])).toBe("Not created yet")
    expect(rowsSummary(profile, rows(""))).toBe("Filled in")
  })
})

describe("cvPdfSummary", () => {
  it("counts the Langs with a PDF", () => {
    expect(cvPdfSummary([], 6)).toBe("No PDF yet")
    expect(cvPdfSummary([{}, {}], 6)).toBe("2 of 6 Langs")
  })
})
