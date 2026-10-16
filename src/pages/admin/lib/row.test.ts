import { describe, expect, it } from "vitest"

import { findEntity } from "../model/entities"
import { cellText, rowTitle, translatedLangs } from "./row"

const projects = findEntity("projects")!

const project = {
  id: 4,
  slug: "plotops",
  status: "in_progress",
  translations: {
    ru: { title: "ПлотОпс" },
    en: { title: "PlotOps" },
  },
}

describe("rowTitle", () => {
  it("prefers the EN Translation, then other Langs, then plain fields", () => {
    expect(rowTitle(projects, project)).toBe("PlotOps")
    expect(
      rowTitle(projects, { ...project, translations: { de: { title: "P" } } })
    ).toBe("P")
    expect(rowTitle(projects, { ...project, translations: {} })).toBe("plotops")
    expect(rowTitle(findEntity("tags")!, { id: 9 })).toBe("tag #9")
  })
})

describe("translatedLangs", () => {
  it("lists Langs in their usual order", () => {
    expect(translatedLangs(project)).toEqual(["en", "ru"])
  })
})

describe("cellText", () => {
  it("formats by column kind", () => {
    expect(
      cellText(project, { label: "", field: "status", kind: "status" })
    ).toBe("in progress")
    expect(
      cellText(
        { id: 1, startMonth: "2024-02", endMonth: null },
        { label: "", field: "startMonth", kind: "period" }
      )
    ).toBe("2024-02 – present")
    expect(
      cellText(
        { id: 1, durationSeconds: 125 },
        { label: "", field: "durationSeconds", kind: "duration" }
      )
    ).toBe("2:05")
    expect(
      cellText(
        { id: 1, publishedAt: "2026-10-01T10:00:00.000Z" },
        { label: "", field: "publishedAt", kind: "date" }
      )
    ).toBe("Oct 1, 2026")
  })
})
