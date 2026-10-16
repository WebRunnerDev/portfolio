import { describe, expect, it } from "vitest"

import { findEntity } from "../model/entities"
import {
  buildBody,
  initialValues,
  isRequired,
  otherErrors,
  validateBody,
} from "./form"

const projects = findEntity("projects")!
const photos = findEntity("photos")!
const tracks = findEntity("tracks")!

describe("buildBody", () => {
  it("puts translated fields into the EN Translation and drops empty ones", () => {
    const values = {
      ...initialValues(projects.createFields),
      title: "PlotOps",
      slug: "plotops",
      description: "Field planning",
      githubUrl: "  ",
    }
    expect(buildBody(projects, values)).toEqual({
      slug: "plotops",
      status: "in_progress",
      featured: false,
      inCv: false,
      translations: { en: { title: "PlotOps", description: "Field planning" } },
    })
  })

  it("leaves out an optional Translation and adds what the upload filled", () => {
    const values = { albumId: "3", r2Key: "image/a.jpg", caption: "" }
    expect(buildBody(photos, values, { width: 800, height: 600 })).toEqual({
      albumId: 3,
      r2Key: "image/a.jpg",
      width: 800,
      height: 600,
    })
  })

  it("splits lines and reads numbers", () => {
    const experience = findEntity("experience")!
    const body = buildBody(experience, {
      ...initialValues(experience.createFields),
      bullets: "One\n\n  Two  \n",
    })
    expect(body.translations).toEqual({ en: { bullets: ["One", "Two"] } })
    expect(buildBody(tracks, { durationSeconds: "184" }).durationSeconds).toBe(
      184
    )
  })
})

describe("initialValues", () => {
  it("takes defaults from the fields and a preset", () => {
    expect(initialValues(photos.createFields, { albumId: 7 })).toEqual({
      albumId: "7",
      r2Key: "",
      caption: "",
    })
  })
})

describe("isRequired", () => {
  it("follows the create schema", () => {
    const { create } = projects.schemas
    expect(isRequired(create, "slug")).toBe(true)
    expect(isRequired(create, "githubUrl")).toBe(false)
    expect(isRequired(create, "translations.en.title")).toBe(true)
    expect(isRequired(photos.schemas.create, "translations.en.caption")).toBe(
      false
    )
  })
})

describe("validateBody", () => {
  it("reports missing and malformed values by dot path", () => {
    const body = buildBody(projects, {
      ...initialValues(projects.createFields),
      slug: "Not A Slug",
      demoUrl: "nope",
    })
    const errors = validateBody(projects, body)
    expect(errors["translations.en.title"]).toEqual(["Required"])
    expect(errors["translations.en.description"]).toEqual(["Required"])
    expect(errors.slug).toEqual(["Expected a lowercase-kebab slug"])
    expect(errors.demoUrl).toHaveLength(1)
  })

  it("passes a valid body", () => {
    const body = buildBody(findEntity("tags")!, { name: "Web", slug: "web" })
    expect(validateBody(findEntity("tags")!, body)).toEqual({})
  })

  it("asks for a photo's file", () => {
    const errors = validateBody(photos, buildBody(photos, { albumId: "1" }))
    expect(errors.r2Key).toEqual(["Required"])
    // Filled by the upload, not shown as a field.
    expect(otherErrors(photos.createFields, errors)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^width: /)])
    )
  })
})
