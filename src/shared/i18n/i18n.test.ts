import { describe, expect, it } from "vitest"

import { LANGS } from "@contracts/lang"

import { formatDate, formatNumber } from "./format"
import { MESSAGES } from "./messages"

describe("messages", () => {
  it("has a dictionary for every Lang with the EN keys", () => {
    const keys = Object.keys(MESSAGES.en).sort()
    for (const lang of LANGS) {
      expect(Object.keys(MESSAGES[lang]).sort()).toEqual(keys)
    }
  })
})

describe("Intl formatting", () => {
  const date = new Date(Date.UTC(2026, 9, 15, 12))

  it("uses Western digits for ar", () => {
    expect(formatNumber(1234.5, "ar")).toMatch(/^1.234.5$/)
    expect(formatDate(date, "ar")).toMatch(/^15 .+ 2026$/)
  })

  it("formats per Lang", () => {
    expect(formatNumber(1234.5, "de")).toBe("1.234,5")
    expect(formatDate(date, "ru")).toBe("15 октября 2026 г.")
  })
})
