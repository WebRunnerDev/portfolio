// Runs in workerd (the `worker` project in vite.config.ts).
import { sValidator } from "@hono/standard-validator"
import { env, exports } from "cloudflare:workers"
import * as v from "valibot"
import { describe, expect, it, vi } from "vitest"
import { ApiErrorSchema } from "@contracts/api/errors"
import { HealthResponseSchema } from "@contracts/api/health"
import { createApp } from "./app"
import { rejectInvalid } from "./errors"

function request(path: string, init?: RequestInit) {
  return exports.default.fetch(`https://webrunner.dev${path}`, init)
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  expect(response.headers.get("Content-Type")).toMatch(/^application\/json/)
  const body = await response.json()
  expect(v.is(ApiErrorSchema, body)).toBe(true)
  expect(body).toEqual({ error: code })
}

describe("/api/health", () => {
  it("answers GET with the health contract", async () => {
    const response = await request("/api/health")
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(v.parse(HealthResponseSchema, body)).toEqual({ status: "ok" })
  })

  it("answers HEAD without a body", async () => {
    const response = await request("/api/health", { method: "HEAD" })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("")
  })

  it("rejects other methods with 405 and Allow", async () => {
    const response = await request("/api/health", { method: "POST" })
    expect(response.headers.get("Allow")).toBe("GET, HEAD")
    await expectError(response, 405, "method_not_allowed")
  })
})

describe("API errors", () => {
  it("answers an unknown /api/* path with a JSON 404", async () => {
    await expectError(await request("/api/nope"), 404, "not_found")
  })

  // Test-only routes on an app with the same error handling as the real one.
  const app = createApp()
    .get("/boom", () => {
      throw new Error("secret detail")
    })
    .post(
      "/echo",
      sValidator("json", v.object({ name: v.string() }), rejectInvalid),
      (c) => c.json(c.req.valid("json"))
    )

  it("turns an unhandled exception into 500 without details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const response = await app.request("/boom", {}, env)
    expect(await response.clone().text()).not.toContain("secret")
    await expectError(response, 500, "internal_error")
    expect(log).toHaveBeenCalledOnce()
    log.mockRestore()
  })

  function post(body: string) {
    return app.request(
      "/echo",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      },
      env
    )
  }

  it("passes a body that matches the schema", async () => {
    const response = await post(JSON.stringify({ name: "Aibyn" }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ name: "Aibyn" })
  })

  it("rejects a body that doesn't match the schema with 400", async () => {
    await expectError(
      await post(JSON.stringify({ name: 1 })),
      400,
      "invalid_request"
    )
  })

  it("rejects malformed JSON with 400", async () => {
    await expectError(await post("{"), 400, "invalid_request")
  })
})

describe("worker test environment", () => {
  it("has a local D1 with the migrated schema", async () => {
    const row = await env.DB.prepare("SELECT count(*) AS n FROM post").first()
    expect(row).toEqual({ n: 0 })
  })
})
