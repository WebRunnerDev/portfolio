// Runs in workerd (the `worker` project in vite.config.ts), where
// ACCESS_TEAM_DOMAIN and ACCESS_AUD point at a test Access application.
import { env, exports } from "cloudflare:workers"
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from "jose"
import * as v from "valibot"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { AdminMeResponseSchema } from "@contracts/api/admin"
import { api } from "."

const TEAM = "https://test.cloudflareaccess.com"
const KID = "test-key"
const EMAIL = "owner@example.com"

let accessKey: CryptoKey
let otherKey: CryptoKey

// The test Access application publishes the public half of `accessKey`.
beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true })
  accessKey = pair.privateKey
  otherKey = (await generateKeyPair("RS256")).privateKey
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: KID, alg: "RS256" }
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url === `${TEAM}/cdn-cgi/access/certs`) {
      return Response.json({ keys: [jwk] })
    }
    return new Response(null, { status: 404 })
  })
})

afterAll(() => {
  vi.restoreAllMocks()
})

type Claims = { aud?: string; iss?: string; exp?: number | string }

function accessJwt(claims: Claims = {}, key = accessKey) {
  return new SignJWT({ email: EMAIL })
    .setProtectedHeader({ alg: "RS256", kid: KID })
    .setIssuer(claims.iss ?? TEAM)
    .setAudience(claims.aud ?? "test-aud")
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? "5m")
    .sign(key)
}

function getMe(token?: string, path = "/api/admin/me") {
  const headers: HeadersInit = token ? { "Cf-Access-Jwt-Assertion": token } : {}
  return exports.default.fetch(`https://webrunner.dev${path}`, { headers })
}

async function expectUnauthorized(response: Response) {
  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({ error: "unauthorized" })
}

describe("Access JWT on /api/admin/*", () => {
  it("lets a valid JWT through and answers /me with its email", async () => {
    const response = await getMe(await accessJwt())
    expect(response.status).toBe(200)
    expect(v.parse(AdminMeResponseSchema, await response.json())).toEqual({
      email: EMAIL,
    })
  })

  it("rejects a request without a JWT", async () => {
    await expectUnauthorized(await getMe())
  })

  it("rejects an expired JWT", async () => {
    const hourAgo = Math.floor(Date.now() / 1000) - 3600
    await expectUnauthorized(await getMe(await accessJwt({ exp: hourAgo })))
  })

  it("rejects a JWT for another Access application", async () => {
    await expectUnauthorized(await getMe(await accessJwt({ aud: "other-aud" })))
  })

  it("rejects a JWT from another team", async () => {
    const iss = "https://other.cloudflareaccess.com"
    await expectUnauthorized(await getMe(await accessJwt({ iss })))
  })

  it("rejects a JWT with a wrong signature", async () => {
    await expectUnauthorized(await getMe(await accessJwt({}, otherKey)))
  })

  it("rejects garbage in the header", async () => {
    await expectUnauthorized(await getMe("not-a-jwt"))
  })

  it("checks unknown admin paths before answering 404", async () => {
    await expectUnauthorized(await getMe(undefined, "/api/admin/nope"))
    const response = await getMe(await accessJwt(), "/api/admin/nope")
    expect(response.status).toBe(404)
  })

  it("answers 500 when the Access vars are empty", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const response = await api.request(
      "https://webrunner.dev/api/admin/me",
      { headers: { "Cf-Access-Jwt-Assertion": await accessJwt() } },
      { ...env, ACCESS_AUD: "" }
    )
    expect(response.status).toBe(500)
    expect(log).toHaveBeenCalledOnce()
    log.mockRestore()
  })
})

describe("dev bypass", () => {
  const devEnv = { ...env, ACCESS_DEV_EMAIL: "dev@example.com" }

  function getMeAt(origin: string, bindings: Env) {
    return api.request(`${origin}/api/admin/me`, {}, bindings)
  }

  it("lets a localhost request through as ACCESS_DEV_EMAIL", async () => {
    const response = await getMeAt("http://localhost:5173", devEnv)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ email: "dev@example.com" })
  })

  it("is off without ACCESS_DEV_EMAIL", async () => {
    await expectUnauthorized(await getMeAt("http://localhost:5173", env))
  })

  it("is off in production and Previews even with the variable set", async () => {
    for (const origin of [
      "https://webrunner.dev",
      "https://feat-x-webrunner.zhasulan-abdigaliev.workers.dev",
    ]) {
      await expectUnauthorized(await getMeAt(origin, devEnv))
    }
  })

  it("is not configured in wrangler.jsonc", () => {
    expect(env).not.toHaveProperty("ACCESS_DEV_EMAIL")
  })
})
