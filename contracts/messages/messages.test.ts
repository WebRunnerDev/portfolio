import { describe, expect, it } from "vitest"

import { LANGS } from "../lang"
import { MESSAGES } from "."

describe("messages", () => {
  it("has a dictionary for every Lang with the EN keys", () => {
    const keys = Object.keys(MESSAGES.en).sort()
    for (const lang of LANGS) {
      expect(Object.keys(MESSAGES[lang]).sort()).toEqual(keys)
    }
  })

  // No EN string is left on /ar/: every message has Arabic letters, names
  // such as LinkedIn or RSS inside an Arabic phrase.
  it("translates every ar message", () => {
    const untranslated = Object.entries(MESSAGES.ar).filter(
      ([, text]) => !/\p{Script=Arabic}/u.test(text)
    )
    expect(untranslated).toEqual([])
  })
})
