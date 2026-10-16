import { Hono } from "hono"
import * as v from "valibot"
import { CspReportSchema, type CspReport } from "@contracts/api/csp-report"
import type { ApiEnv } from "../app"
import { apiError, methodNotAllowed } from "../errors"

export type CspViolation = {
  documentUrl?: string
  blockedUrl?: string
  directive?: string
  disposition?: string
  sourceFile?: string
  line?: number
  column?: number
  sample?: string
}

// Both formats as one list; reports of other types are left out.
export function violations(report: CspReport): CspViolation[] {
  if (!Array.isArray(report)) {
    const r = report["csp-report"]
    return [
      {
        documentUrl: r["document-uri"],
        blockedUrl: r["blocked-uri"],
        directive: r["effective-directive"] ?? r["violated-directive"],
        disposition: r.disposition,
        sourceFile: r["source-file"],
        line: r["line-number"],
        column: r["column-number"],
        sample: r["script-sample"],
      },
    ]
  }
  return report.flatMap(({ type, body }) =>
    type === "csp-violation" && body
      ? [
          {
            documentUrl: body.documentURL,
            blockedUrl: body.blockedURL,
            directive: body.effectiveDirective,
            disposition: body.disposition,
            sourceFile: body.sourceFile,
            line: body.lineNumber,
            column: body.columnNumber,
            sample: body.sample,
          },
        ]
      : []
  )
}

// The body is decoded by hand: neither Content-Type browsers send is
// `application/json`, which Hono's validator wants, and workerd warns on
// `.text()` of `application/csp-report`. Each violation goes to Workers Logs
// (observability in wrangler.jsonc) as its own entry.
export const cspReport = new Hono<ApiEnv>()
  .post("/", async (c) => {
    let json: unknown
    try {
      json = JSON.parse(new TextDecoder().decode(await c.req.arrayBuffer()))
    } catch {
      return apiError(c, 400, "invalid_request")
    }
    const parsed = v.safeParse(CspReportSchema, json)
    if (!parsed.success) return apiError(c, 400, "invalid_request")

    for (const violation of violations(parsed.output)) {
      console.warn({ message: "csp-violation", ...violation })
    }
    return c.body(null, 204)
  })
  .all("/", methodNotAllowed("POST"))
