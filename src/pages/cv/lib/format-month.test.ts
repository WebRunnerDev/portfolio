import { describe, expect, it } from "vitest"

import { formatMonth } from "./format-month"

describe("formatMonth", () => {
  it("names the month on the Lang", () => {
    expect(formatMonth("2024-01", "en")).toBe("Jan 2024")
    expect(formatMonth("2023-12", "de")).toBe("Dez. 2023")
  })

  it("keeps Western digits on ar", () => {
    expect(formatMonth("2024-01", "ar")).toMatch(/2024/)
  })
})
