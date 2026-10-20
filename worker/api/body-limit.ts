import { bodyLimit } from "hono/body-limit"
import { createMiddleware } from "hono/factory"
import { CSP_REPORT_PATH } from "@contracts/api/csp-report"
import { MAX_UPLOAD_BYTES } from "@contracts/media"
import type { ApiEnv } from "./app"
import { apiError } from "./errors"

// Every other body is JSON: a post body of Markdown fits many times over.
export const MAX_JSON_BYTES = 1024 * 1024

// A batch of CSP reports from one page: anyone can post there, so the limit
// is far below a JSON body's.
export const MAX_CSP_REPORT_BYTES = 64 * 1024

// An upload may be as large as the largest kind; its own kind's limit is
// checked once its bytes say what it is (routes/admin/uploads.ts).
export const MAX_UPLOAD_BODY_BYTES = Math.max(
  ...Object.values(MAX_UPLOAD_BYTES)
)

// A file as the raw body: POST /api/admin/uploads, or a CV PDF uploaded by
// hand (PUT /api/admin/cv-pdf/:lang).
export function isUpload(method: string, path: string) {
  return (
    (method === "POST" && /^\/api\/admin\/uploads\/?$/.test(path)) ||
    (method === "PUT" && isCvPdfPath(path))
  )
}

// POST starts a browser: it gets a rate limit of its own.
export function isCvPdfRender(method: string, path: string) {
  return method === "POST" && isCvPdfPath(path)
}

function isCvPdfPath(path: string) {
  return /^\/api\/admin\/cv-pdf\/[^/]+\/?$/.test(path)
}

export function isCspReport(path: string) {
  return path.replace(/\/$/, "") === CSP_REPORT_PATH
}

function limitTo(maxSize: number) {
  return bodyLimit({
    maxSize,
    onError: (c) => apiError(c, 413, "payload_too_large"),
  })
}

const uploadLimit = limitTo(MAX_UPLOAD_BODY_BYTES)
const jsonLimit = limitTo(MAX_JSON_BYTES)
const cspReportLimit = limitTo(MAX_CSP_REPORT_BYTES)

// 413 before a handler reads the body. A declared Content-Length over the
// limit is refused unread; a body without one is cut off once it passes it.
export const limitBody = createMiddleware<ApiEnv>((c, next) => {
  if (isUpload(c.req.method, c.req.path)) return uploadLimit(c, next)
  if (isCspReport(c.req.path)) return cspReportLimit(c, next)
  return jsonLimit(c, next)
})
