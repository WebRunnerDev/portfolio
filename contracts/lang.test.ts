import { describe, expect, it } from "vitest"

import { pickLang, withLang } from "./lang"

describe("pickLang", () => {
  it("prefers the cookie over Accept-Language", () => {
    expect(pickLang({ cookie: "lang=kk", acceptLanguage: "de-DE,de" })).toBe(
      "kk"
    )
  })

  it("finds the cookie among others", () => {
    expect(pickLang({ cookie: "theme=dark; lang=ar; x=1" })).toBe("ar")
  })

  it("ignores a cookie with an unknown Lang", () => {
    expect(pickLang({ cookie: "lang=fr", acceptLanguage: "es" })).toBe("es")
  })

  it("uses the primary subtag of Accept-Language", () => {
    expect(pickLang({ acceptLanguage: "ar-SA" })).toBe("ar")
    expect(pickLang({ acceptLanguage: "RU-ru" })).toBe("ru")
  })

  it("picks the highest-q supported Lang", () => {
    expect(
      pickLang({ acceptLanguage: "fr-FR,fr;q=0.9,de;q=0.7,ru;q=0.8" })
    ).toBe("ru")
  })

  it("keeps header order for equal q", () => {
    expect(pickLang({ acceptLanguage: "kk, ru" })).toBe("kk")
    expect(pickLang({ acceptLanguage: "es;q=0.5,de;q=0.5" })).toBe("es")
  })

  it("skips q=0", () => {
    expect(pickLang({ acceptLanguage: "ru;q=0,de;q=0.1" })).toBe("de")
  })

  it("falls back to en", () => {
    expect(pickLang({})).toBe("en")
    expect(pickLang({ cookie: "", acceptLanguage: "" })).toBe("en")
    expect(pickLang({ cookie: null, acceptLanguage: "fr, *;q=0.5" })).toBe("en")
  })
})

describe("withLang", () => {
  it("swaps the Lang and keeps the path", () => {
    expect(withLang("/ru/projects/x", "de")).toBe("/de/projects/x")
    expect(withLang("/ru", "ar")).toBe("/ar")
    expect(withLang("/ru/", "en")).toBe("/en")
  })

  it("replaces an unknown language code", () => {
    expect(withLang("/fr/design", "en")).toBe("/en/design")
  })

  it("prepends a Lang to a path without one", () => {
    expect(withLang("/design", "en")).toBe("/en/design")
    expect(withLang("/", "en")).toBe("/en")
  })
})
