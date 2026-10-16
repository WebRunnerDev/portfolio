import { createMiddleware } from "hono/factory"
import type { ApiEnv } from "./app"
import { isCspReport } from "./body-limit"
import { apiError } from "./errors"

// Cross-site writes. The SPA and the API share one origin (ADR-0001), so the
// Worker gives no CORS headers to any Origin and doesn't answer preflights.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

// Browsers send Origin with every cross-origin request and with same-origin
// writes. A write from another origin answers 403 whatever its Content-Type,
// so a form on another site can't post to /api/admin/* with the owner's
// Access cookie. A request without Origin (curl, Vitest) isn't a browser's.
// CSP reports pass with any Origin: the browser sends them outside the page,
// and they only reach the logs.
export const checkOrigin = createMiddleware<ApiEnv>(async (c, next) => {
  const origin = c.req.header("Origin")
  if (
    origin !== undefined &&
    !isCspReport(c.req.path) &&
    !SAFE_METHODS.has(c.req.method) &&
    origin !== new URL(c.req.url).origin
  ) {
    return apiError(c, 403, "forbidden")
  }
  await next()
})
