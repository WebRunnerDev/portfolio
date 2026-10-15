import { createMiddleware } from "hono/factory"
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose"
import type { ApiEnv } from "./app"
import { apiError } from "./errors"

// ADR-0004: Cloudflare Access sits in front of /api/admin/*, and the Worker
// checks the JWT it adds to every request it lets through.
export type AdminEnv = ApiEnv & { Variables: { email: string } }

// Only from .dev.vars, so it is not part of the generated Env.
type LocalEnv = Env & { ACCESS_DEV_EMAIL?: string }

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

// One key set per team domain for the life of the isolate. jose keeps the keys
// in memory and refetches them when a token names a key it doesn't know (key
// rotation).
const keySets = new Map<string, JWTVerifyGetKey>()

function accessKeys(teamDomain: string) {
  let keys = keySets.get(teamDomain)
  if (!keys) {
    keys = createRemoteJWKSet(
      new URL(`https://${teamDomain}/cdn-cgi/access/certs`)
    )
    keySets.set(teamDomain, keys)
  }
  return keys
}

async function verifiedEmail(token: string, env: Env) {
  const teamDomain = env.ACCESS_TEAM_DOMAIN as string
  const aud = env.ACCESS_AUD as string
  // Fail closed and loudly: an empty var is a deploy mistake, not a bad token.
  if (!teamDomain || !aud) {
    throw new Error("ACCESS_TEAM_DOMAIN and ACCESS_AUD must be set")
  }
  try {
    const { payload } = await jwtVerify(token, accessKeys(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience: aud,
      algorithms: ["RS256"],
    })
    return typeof payload.email === "string" ? payload.email : undefined
  } catch {
    return undefined
  }
}

// Dev bypass: needs ACCESS_DEV_EMAIL from .dev.vars *and* a localhost request,
// so a variable set by mistake in production or a Preview opens nothing.
function devEmail(url: string, env: LocalEnv) {
  if (!env.ACCESS_DEV_EMAIL) return undefined
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) return undefined
  return env.ACCESS_DEV_EMAIL
}

export const requireAccess = createMiddleware<AdminEnv>(async (c, next) => {
  const token = c.req.header("Cf-Access-Jwt-Assertion")
  const email =
    devEmail(c.req.url, c.env) ??
    (token ? await verifiedEmail(token, c.env) : undefined)
  if (!email) return apiError(c, 401, "unauthorized")
  c.set("email", email)
  await next()
})
