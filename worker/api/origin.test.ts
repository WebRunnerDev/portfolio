// Runs in workerd (the `worker` project in vite.config.ts), through the whole
// Worker.
import { exports } from "cloudflare:workers"
import { describe, expect, it } from "vitest"

function request(url: string, origin: string, init: RequestInit = {}) {
  return exports.default.fetch(url, {
    ...init,
    headers: { ...init.headers, Origin: origin },
  })
}

function corsHeaders(response: Response) {
  return [...response.headers.keys()].filter((name) =>
    name.startsWith("access-control-")
  )
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  expect(await response.json()).toEqual({ error: code })
}

const HEALTH = "https://webrunner.dev/api/health"

const preflight = {
  method: "OPTIONS",
  headers: {
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
  },
}

describe("CORS", () => {
  it("allows https://webrunner.dev", async () => {
    const response = await request(HEALTH, "https://webrunner.dev")
    expect(response.status).toBe(200)
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://webrunner.dev"
    )
    expect(response.headers.get("Vary")).toContain("Origin")
  })

  it("gives another origin no CORS headers", async () => {
    for (const origin of [
      "https://evil.example",
      "https://webrunner.dev.evil.example",
      "http://webrunner.dev",
      "http://localhost:5173",
      "null",
    ]) {
      const response = await request(HEALTH, origin)
      expect(response.status).toBe(200)
      expect(corsHeaders(response)).toEqual([])
      expect(response.headers.get("Vary")).toContain("Origin")
    }
  })

  it("answers a preflight from https://webrunner.dev", async () => {
    const response = await request(
      "https://webrunner.dev/api/admin/tags",
      "https://webrunner.dev",
      preflight
    )
    expect(response.status).toBe(204)
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://webrunner.dev"
    )
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "PATCH"
    )
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type"
    )
  })

  it("answers a preflight from another origin without CORS headers", async () => {
    const response = await request(
      "https://webrunner.dev/api/admin/tags",
      "https://evil.example",
      preflight
    )
    expect(corsHeaders(response)).toEqual([])
  })

  it("allows a localhost page only on a localhost Worker", async () => {
    const response = await request(
      "http://localhost:5174/api/health",
      "http://localhost:5173"
    )
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173"
    )
  })
})

describe("writes from another origin", () => {
  it("answers 403 before the Access check, whatever the Content-Type", async () => {
    for (const contentType of ["application/json", "text/plain"]) {
      const response = await request(
        "https://webrunner.dev/api/admin/tags",
        "https://evil.example",
        {
          method: "POST",
          headers: { "Content-Type": contentType },
          body: "{}",
        }
      )
      await expectError(response, 403, "forbidden")
      expect(corsHeaders(response)).toEqual([])
    }
  })

  it("answers 403 to a localhost page on the real site", async () => {
    const response = await request(
      "https://webrunner.dev/api/admin/uploads",
      "http://localhost:5173",
      { method: "POST", body: "x" }
    )
    await expectError(response, 403, "forbidden")
  })

  it("lets same-origin writes through, on a Preview too", async () => {
    for (const origin of [
      "https://webrunner.dev",
      "https://feat-webrunner.example.workers.dev",
    ]) {
      const response = await request(`${origin}/api/admin/tags`, origin, {
        method: "POST",
      })
      await expectError(response, 401, "unauthorized")
    }
  })

  it("lets requests without Origin through", async () => {
    const response = await exports.default.fetch(
      "https://webrunner.dev/api/admin/tags",
      { method: "DELETE" }
    )
    await expectError(response, 401, "unauthorized")
  })
})
