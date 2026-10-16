import { bodyLimit } from "hono/body-limit"
import { createMiddleware } from "hono/factory"
import { MAX_UPLOAD_BYTES } from "@contracts/media"
import type { ApiEnv } from "./app"
import { apiError } from "./errors"

// Every other body is JSON: a post body of Markdown fits many times over.
export const MAX_JSON_BYTES = 1024 * 1024

// An upload may be as large as the largest kind; its own kind's limit is
// checked once its bytes say what it is (routes/admin/uploads.ts).
export const MAX_UPLOAD_BODY_BYTES = Math.max(
  ...Object.values(MAX_UPLOAD_BYTES)
)

export function isUpload(method: string, path: string) {
  return method === "POST" && /^\/api\/admin\/uploads\/?$/.test(path)
}

function limitTo(maxSize: number) {
  return bodyLimit({
    maxSize,
    onError: (c) => apiError(c, 413, "payload_too_large"),
  })
}

const uploadLimit = limitTo(MAX_UPLOAD_BODY_BYTES)
const jsonLimit = limitTo(MAX_JSON_BYTES)

// 413 before a handler reads the body. A declared Content-Length over the
// limit is refused unread; a body without one is cut off once it passes it.
export const limitBody = createMiddleware<ApiEnv>((c, next) =>
  isUpload(c.req.method, c.req.path) ? uploadLimit(c, next) : jsonLimit(c, next)
)
