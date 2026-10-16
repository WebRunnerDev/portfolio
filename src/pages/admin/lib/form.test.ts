import { describe, expect, it } from "vitest"

import { findEntity } from "../model/entities"
import {
  buildBody,
  completeness,
  initialValues,
  isRequired,
  otherErrors,
  patchBody,
  plainFields,
  sameValues,
  translatedFields,
  translationBody,
  validateBody,
  validatePatch,
  validateTranslation,
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

  it("shows a stored row: lines, ids, nulls", () => {
    const values = initialValues(projects.fields, {
      slug: "plotops",
      demoUrl: null,
      featured: true,
      technologyIds: [3, 1],
      cvBullets: ["One", "Two"],
    })
    expect(values).toMatchObject({
      slug: "plotops",
      demoUrl: "",
      featured: true,
      inCv: false,
      technologyIds: [3, 1],
      cvBullets: "One\nTwo",
    })
  })
})

describe("the editor", () => {
  const posts = findEntity("posts")!

  it("splits the fields into the row's and the Translation's", () => {
    expect(plainFields(projects).map((field) => field.name)).not.toContain(
      "title"
    )
    expect(translatedFields(projects).map((field) => field.name)).toEqual([
      "title",
      "description",
      "cvBullets",
      "caseStudy",
    ])
  })

  it("patches every field and clears emptied optional ones", () => {
    const values = {
      ...initialValues(projects.fields, { slug: "plotops", coverKey: "k" }),
      coverKey: "",
      technologyIds: [2],
    }
    const body = patchBody(projects, values)
    expect(body).toEqual({
      slug: "plotops",
      status: "in_progress",
      githubUrl: null,
      demoUrl: null,
      featured: false,
      inCv: false,
      coverKey: null,
      technologyIds: [2],
    })
    expect(validatePatch(projects, body)).toEqual({})
  })

  it("asks for an emptied required field", () => {
    const body = patchBody(projects, initialValues(projects.fields))
    expect(body).not.toHaveProperty("slug")
    expect(validatePatch(projects, body).slug).toEqual(["Required"])
  })

  it("puts the whole Translation and leaves defaults to the schema", () => {
    const body = translationBody(posts, {
      ...initialValues(translatedFields(posts)),
      title: "Привет",
      readingMinutes: "4",
    })
    expect(body).toEqual({ title: "Привет", readingMinutes: 4 })
    expect(validateTranslation(posts, body)).toEqual({})
    expect(validateTranslation(posts, {}).title).toEqual(["Required"])
  })

  it("edits a timestamp in local time and sends it as ISO", () => {
    const iso = "2026-10-16T09:30:00.000Z"
    const values = initialValues(plainFields(posts), { publishedAt: iso })
    expect(values.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(patchBody(posts, values).publishedAt).toBe(iso)
  })

  it("counts the filled fields of a Translation", () => {
    expect(
      completeness(projects, {
        title: "PlotOps",
        cvBullets: " ",
        caseStudy: "",
      })
    ).toEqual({ filled: 1, total: 4 })
  })

  it("compares values", () => {
    expect(sameValues({ a: "1", ids: [1] }, { a: "1", ids: [1] })).toBe(true)
    expect(sameValues({ ids: [1, 2] }, { ids: [2, 1] })).toBe(false)
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
