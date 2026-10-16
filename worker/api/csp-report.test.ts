// Runs in workerd (the `worker` project in vite.config.ts), through the whole
// Worker.
import { exports } from "cloudflare:workers"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MAX_CSP_REPORT_BYTES } from "./body-limit"

const REPORT_URL = "https://webrunner.dev/api/csp-report"

function post(body: string, contentType: string, origin = "null") {
  return exports.default.fetch(REPORT_URL, {
    method: "POST",
    headers: { "Content-Type": contentType, Origin: origin },
    body,
  })
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  expect(await response.json()).toEqual({ error: code })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("POST /api/csp-report", () => {
  it("logs a report-uri violation", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const response = await post(
      JSON.stringify({
        "csp-report": {
          "document-uri": "https://webrunner.dev/en",
          "blocked-uri": "inline",
          "effective-directive": "script-src-elem",
          "violated-directive": "script-src-elem",
          disposition: "report",
          "source-file": "https://webrunner.dev/en",
          "line-number": 3,
          "column-number": 7,
          "script-sample": "alert(1)",
          "original-policy": "default-src 'self'",
        },
      }),
      "application/csp-report"
    )
    expect(response.status).toBe(204)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith({
      message: "csp-violation",
      documentUrl: "https://webrunner.dev/en",
      blockedUrl: "inline",
      directive: "script-src-elem",
      disposition: "report",
      sourceFile: "https://webrunner.dev/en",
      line: 3,
      column: 7,
      sample: "alert(1)",
    })
  })

  it("logs each violation of a report-to batch, and nothing else", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const violation = (blockedURL: string) => ({
      type: "csp-violation",
      age: 10,
      url: "https://webrunner.dev/ar",
      user_agent: "Chrome",
      body: {
        documentURL: "https://webrunner.dev/ar",
        blockedURL,
        effectiveDirective: "img-src",
        disposition: "report",
        statusCode: 200,
      },
    })
    const response = await post(
      JSON.stringify([
        violation("https://evil.example/a.png"),
        { type: "deprecation", body: { id: "x" } },
        violation("https://evil.example/b.png"),
      ]),
      "application/reports+json"
    )
    expect(response.status).toBe(204)
    expect(warn.mock.calls.map(([entry]) => entry.blockedUrl)).toEqual([
      "https://evil.example/a.png",
      "https://evil.example/b.png",
    ])
  })

  it("takes reports whatever their Origin", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const body = JSON.stringify({ "csp-report": { "blocked-uri": "inline" } })
    for (const origin of ["https://webrunner.dev", "https://evil.example"]) {
      const response = await post(body, "application/csp-report", origin)
      expect(response.status).toBe(204)
    }
  })

  it("answers 400 to a body that is not a report", async () => {
    for (const body of ["not json", "{}", '{"csp-report": 1}', "[1]"]) {
      await expectError(
        await post(body, "application/csp-report"),
        400,
        "invalid_request"
      )
    }
  })

  it("answers 413 to a body over the limit", async () => {
    const body = JSON.stringify({
      "csp-report": { "script-sample": "x".repeat(MAX_CSP_REPORT_BYTES) },
    })
    await expectError(
      await post(body, "application/csp-report"),
      413,
      "payload_too_large"
    )
  })

  it("answers 405 to other methods", async () => {
    const response = await exports.default.fetch(REPORT_URL)
    expect(response.headers.get("Allow")).toBe("POST")
    await expectError(response, 405, "method_not_allowed")
  })
})
