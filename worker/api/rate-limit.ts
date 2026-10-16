import { createMiddleware } from "hono/factory"
import type { ApiEnv } from "./app"
import { apiError } from "./errors"
import { isLocalRequest } from "./local"

// Workers Rate Limiting bindings (`ratelimits` in wrangler.jsonc) in place of
// the paid Advanced Rate Limiting rules. Each binding counts per Cloudflare
// location, so the limits are approximate: they stop a flood, not one extra
// request.

// `period` of every binding in wrangler.jsonc: the binding doesn't say when
// its window ends, so Retry-After is the whole period.
export const RATE_LIMIT_PERIOD = 60

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

// The binding and key for a request. Reads count per path, so the few calls
// a page makes don't add up; admin writes and uploads count per IP, since
// their paths carry ids.
function bucket(env: Env, method: string, path: string, ip: string) {
  if (READ_METHODS.has(method) || !path.startsWith("/api/admin/")) {
    return { limiter: env.API_RATE_LIMIT, key: `${ip} ${path}` }
  }
  if (method === "POST" && /^\/api\/admin\/uploads\/?$/.test(path)) {
    return { limiter: env.UPLOAD_RATE_LIMIT, key: ip }
  }
  return { limiter: env.ADMIN_WRITE_RATE_LIMIT, key: ip }
}

// Runs before the Access check, so it also limits requests without a token.
export const rateLimit = createMiddleware<ApiEnv>(async (c, next) => {
  // Cloudflare's edge always sets CF-Connecting-IP. Without it (Vitest) or on
  // localhost (`npm run dev`, e2e), nothing is limited.
  const ip = c.req.header("CF-Connecting-IP")
  if (!ip || isLocalRequest(c.req.url)) return next()

  const { limiter, key } = bucket(c.env, c.req.method, c.req.path, ip)
  const { success } = await limiter.limit({ key })
  if (!success) {
    c.header("Retry-After", String(RATE_LIMIT_PERIOD))
    return apiError(c, 429, "too_many_requests")
  }
  await next()
})
