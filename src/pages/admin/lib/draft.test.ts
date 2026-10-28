import { describe, expect, it } from "vitest"

import { findEntity } from "../model/entities"
import { draftFields, withDraft } from "./draft"
import { initialValues, translatedFields } from "./form"

const posts = findEntity("posts")!
const experience = findEntity("experience")!

describe("draftFields", () => {
  it("sends the EN fields filled in, Markdown marked, lines as a list", () => {
    expect(
      draftFields(posts, { title: "Hello", excerpt: " ", body: "# Hi" })
    ).toEqual([
      { name: "title", value: "Hello", markdown: false },
      { name: "body", value: "# Hi", markdown: true },
    ])
    expect(
      draftFields(experience, {
        ...initialValues(translatedFields(experience)),
        role: "Developer",
        bullets: "One\n\nTwo",
      })
    ).toEqual([
      { name: "role", value: "Developer", markdown: false },
      { name: "bullets", value: ["One", "Two"], markdown: false },
    ])
  })

  it("sends nothing for an empty EN form", () => {
    expect(draftFields(posts, initialValues(translatedFields(posts)))).toEqual(
      []
    )
  })
})

describe("withDraft", () => {
  it("fills the drafted fields and keeps the others", () => {
    const current = { title: "Старое", excerpt: "Оставить", body: "" }
    expect(
      withDraft(posts, current, { title: "Привет", body: "# Привет" })
    ).toEqual({ title: "Привет", excerpt: "Оставить", body: "# Привет" })
  })

  it("shows a list as lines", () => {
    const current = initialValues(translatedFields(experience))
    expect(
      withDraft(experience, current, { bullets: ["Один", "Два"] })
    ).toEqual({ ...current, bullets: "Один\nДва" })
  })
})
