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
  it("gives no CORS headers to any Origin", async () => {
    for (const origin of [
      "https://webrunner.dev",
      "https://evil.example",
      "http://localhost:5173",
      "null",
    ]) {
      const response = await request(HEALTH, origin)
      expect(response.status).toBe(200)
      expect(corsHeaders(response)).toEqual([])
    }
  })

  it("doesn't answer a preflight", async () => {
    for (const origin of ["https://webrunner.dev", "https://evil.example"]) {
      const response = await request(
        "https://webrunner.dev/api/admin/tags",
        origin,
        preflight
      )
      expect(response.status).not.toBe(204)
      expect(corsHeaders(response)).toEqual([])
    }
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

  it("answers 403 to a localhost page on another origin", async () => {
    for (const url of [
      "https://webrunner.dev/api/admin/uploads",
      "http://localhost:5174/api/admin/uploads",
    ]) {
      const response = await request(url, "http://localhost:5173", {
        method: "POST",
        body: "x",
      })
      await expectError(response, 403, "forbidden")
    }
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
