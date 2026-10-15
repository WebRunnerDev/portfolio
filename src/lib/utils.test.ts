import { describe, expect, it } from "vitest"

import { cn } from "./utils"

describe("cn", () => {
  it("lets the later Tailwind class win", () => {
    expect(cn("ps-2", "ps-4")).toBe("ps-4")
  })
})
