import { describe, expect, it } from "vitest"

import { parseTagSearch } from "./tag-search"

describe("parseTagSearch", () => {
  it("keeps a Tag's slug", () => {
    expect(parseTagSearch({ tag: "react" })).toEqual({ tag: "react" })
  })

  it("reads a numeric slug as text", () => {
    expect(parseTagSearch({ tag: 2024 })).toEqual({ tag: "2024" })
  })

  it("drops an empty or odd value", () => {
    expect(parseTagSearch({})).toEqual({})
    expect(parseTagSearch({ tag: " " })).toEqual({})
    expect(parseTagSearch({ tag: ["a"] })).toEqual({})
    expect(parseTagSearch({ tag: true })).toEqual({})
  })
})
