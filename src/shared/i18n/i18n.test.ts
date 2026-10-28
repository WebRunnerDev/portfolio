import { describe, expect, it } from "vitest"

import { formatDate, formatNumber } from "./format"
import { translatePlural } from "./translate"

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

describe("translatePlural", () => {
  it("picks the Lang's plural category and formats the count", () => {
    expect(translatePlural("en", "album.photos", 1)).toBe("1 photo")
    expect(translatePlural("en", "album.photos", 1200)).toBe("1,200 photos")
    expect(translatePlural("ru", "album.photos", 1)).toBe("1 фотография")
    expect(translatePlural("ru", "album.photos", 3)).toBe("3 фотографии")
    expect(translatePlural("ru", "album.photos", 5)).toBe("5 фотографий")
    expect(translatePlural("de", "album.photos", 0)).toBe("0 Fotos")
  })

  it("has every category in every dictionary", () => {
    // Arabic uses all six: zero, one, two, few, many, other. Zero, one and
    // two are words without the number; the rest keep Western digits.
    const forms = [0, 1, 2, 3, 11, 100].map((count) =>
      translatePlural("ar", "album.photos", count)
    )
    expect(new Set(forms.slice(0, 4)).size).toBe(4)
    for (const form of forms) expect(form).not.toContain("{count}")
    for (const form of forms.slice(3)) expect(form).toMatch(/^\d+ /)
  })
})
