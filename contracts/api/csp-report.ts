import * as v from "valibot"

// POST /api/csp-report: violations of the Content-Security-Policy, as
// browsers send them (worker/README.md › Security headers).
export const CSP_REPORT_PATH = "/api/csp-report"

const text = v.optional(v.string())
const count = v.optional(v.number())

// `report-uri`: one violation, `Content-Type: application/csp-report`.
export const CspReportUriSchema = v.object({
  "csp-report": v.object({
    "document-uri": text,
    "blocked-uri": text,
    "effective-directive": text,
    "violated-directive": text,
    disposition: text,
    "source-file": text,
    "line-number": count,
    "column-number": count,
    "script-sample": text,
  }),
})

// `report-to` (Reporting API): a batch, `application/reports+json`. Reports
// of other types may come in the same batch.
export const ReportToSchema = v.array(
  v.object({
    type: v.string(),
    body: v.optional(
      v.object({
        documentURL: text,
        blockedURL: text,
        effectiveDirective: text,
        disposition: text,
        sourceFile: text,
        lineNumber: count,
        columnNumber: count,
        sample: text,
      })
    ),
  })
)

export const CspReportSchema = v.union([CspReportUriSchema, ReportToSchema])

export type CspReport = v.InferOutput<typeof CspReportSchema>
