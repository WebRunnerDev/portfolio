import { describe, expect, it } from "vitest"

import index from "./index.ts?raw"

const components = Object.keys(import.meta.glob("./*.tsx"))

describe("shared/ui/kit", () => {
  it("exports every shadcn component from its public API", () => {
    expect(components.length).toBeGreaterThan(0)
    for (const path of components) {
      expect(index).toContain(`from "${path.replace(/\.tsx$/, "")}"`)
    }
  })
})
