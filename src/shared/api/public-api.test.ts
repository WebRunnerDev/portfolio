import { afterEach, describe, expect, it, vi } from "vitest"

import {
  PublicApiError,
  getProfile,
  getProject,
  getProjects,
  isNotFound,
} from "./public-api"

const project = {
  fallback: true,
  id: 1,
  slug: "plotops",
  title: "PlotOps",
  description: "Plots",
  status: "completed",
  coverKey: null,
  githubUrl: null,
  demoUrl: null,
  featured: false,
  inCv: true,
  cvBullets: [],
  hasCaseStudy: false,
  technologies: [],
}

function answer(status: number, body: unknown) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json(body, { status })
  )
  vi.stubGlobal("fetch", fetch)
  return fetch
}

async function failure(call: Promise<unknown>) {
  const error = await call.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(PublicApiError)
  return error as PublicApiError
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("public API client", () => {
  it("asks the Lang's path and answers the parsed body", async () => {
    const fetch = answer(200, [project])
    await expect(getProjects("ru")).resolves.toEqual([project])
    expect(fetch.mock.calls[0][0]).toBe("/api/public/ru/projects")
  })

  it("encodes the slug", async () => {
    const fetch = answer(200, { ...project, caseStudy: null })
    await getProject("en", "a b/c")
    expect(fetch.mock.calls[0][0]).toBe("/api/public/en/projects/a%20b%2Fc")
  })

  it("passes the abort signal on", async () => {
    const fetch = answer(200, [project])
    const { signal } = new AbortController()
    await getProjects("en", { signal })
    expect(fetch.mock.calls[0][1]?.signal).toBe(signal)
  })

  it("rejects an answer that doesn't match the schema", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    answer(200, [{ ...project, status: "draft" }])
    const error = await failure(getProjects("en"))
    expect(error.code).toBe("bad_response")
  })

  it("throws the API error code and status", async () => {
    answer(404, { error: "not_found" })
    const error = await failure(getProfile("de"))
    expect(error).toMatchObject({ status: 404, code: "not_found" })
    expect(isNotFound(error)).toBe(true)
  })

  it("throws bad_response for an error body it doesn't know", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>", { status: 502 }))
    )
    const error = await failure(getProfile("en"))
    expect(error).toMatchObject({ status: 502, code: "bad_response" })
    expect(isNotFound(error)).toBe(false)
  })

  it("throws network_error when there is no answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch")
      })
    )
    const error = await failure(getProjects("en"))
    expect(error).toMatchObject({ status: 0, code: "network_error" })
  })
})
