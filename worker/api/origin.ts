import { createMiddleware } from "hono/factory"
import type { ApiEnv } from "./app"
import { apiError } from "./errors"
import { isLocalRequest } from "./local"

// CORS and cross-site writes. The SPA calls /api/* from its own origin, so a
// browser needs no CORS for it; only https://webrunner.dev (and localhost
// pages on a localhost Worker, in dev) get CORS headers, never `*`.
const SITE_ORIGIN = "https://webrunner.dev"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

// Max-Age of a preflight answer, in seconds.
const PREFLIGHT_MAX_AGE = 600

function isAllowedOrigin(origin: string, url: string) {
  if (origin === SITE_ORIGIN || origin === new URL(url).origin) return true
  // A page on another localhost port (`vite dev` and `vite preview`).
  return isLocalRequest(url) && URL.canParse(origin) && isLocalRequest(origin)
}

// Browsers send Origin with every cross-origin request and with same-origin
// writes. A write from another origin answers 403 whatever its Content-Type,
// so a form on another site can't post to /api/admin/* with the owner's
// Access cookie. A request without Origin (curl, Vitest) isn't a browser's.
export const checkOrigin = createMiddleware<ApiEnv>(async (c, next) => {
  const origin = c.req.header("Origin")
  if (origin === undefined) return next()
  // The answer depends on Origin, so caches keep one per Origin.
  c.header("Vary", "Origin", { append: true })

  if (!isAllowedOrigin(origin, c.req.url)) {
    if (!SAFE_METHODS.has(c.req.method)) return apiError(c, 403, "forbidden")
    return next()
  }

  c.header("Access-Control-Allow-Origin", origin)
  const preflight = c.req.header("Access-Control-Request-Method")
  if (c.req.method === "OPTIONS" && preflight) {
    c.header(
      "Access-Control-Allow-Methods",
      "GET, HEAD, POST, PUT, PATCH, DELETE"
    )
    c.header("Access-Control-Allow-Headers", "Content-Type")
    c.header("Access-Control-Max-Age", String(PREFLIGHT_MAX_AGE))
    return c.body(null, 204)
  }
  await next()
})
