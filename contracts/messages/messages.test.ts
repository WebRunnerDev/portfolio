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
})
