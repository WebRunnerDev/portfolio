import { describe, expect, it } from "vitest"

import { ENTITIES } from "./entities"
import { adminTitle, findItem, SECTIONS } from "./sections"

describe("SECTIONS", () => {
  it("lists every entity once", () => {
    const listed = SECTIONS.flatMap((section) =>
      section.items.flatMap((item) =>
        item.kind === "entity" ? [item.entity.path] : []
      )
    )
    expect(listed.toSorted()).toEqual(
      ENTITIES.map((entity) => entity.path).toSorted()
    )
  })

  it("keeps the CV apart from the site's content", () => {
    expect(findItem("experience")?.section.id).toBe("cv")
    expect(findItem("technologies")?.section.id).toBe("cv")
    expect(findItem("projects")?.section.id).toBe("content")
    expect(findItem("photos")?.section.id).toBe("content")
    expect(findItem("profile")?.section.id).toBe("profile")
    expect(findItem("cv-pdf")?.section.id).toBe("cv")
    expect(findItem("nope")).toBeUndefined()
  })
})

describe("adminTitle", () => {
  it("names the page", () => {
    expect(adminTitle("/admin")).toBe("Admin · WebRunner")
    expect(adminTitle("/admin/")).toBe("Admin · WebRunner")
    expect(adminTitle("/admin/experience")).toBe(
      "Experience · Admin · WebRunner"
    )
    expect(adminTitle("/admin/posts/3")).toBe("Posts · Admin · WebRunner")
    expect(adminTitle("/admin/cv-pdf")).toBe("CV PDF · Admin · WebRunner")
    expect(adminTitle("/admin/nope")).toBe("Not found · Admin · WebRunner")
  })
})
