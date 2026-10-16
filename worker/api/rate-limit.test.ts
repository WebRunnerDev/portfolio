// Runs in workerd (the `worker` project in vite.config.ts) with the
// `ratelimits` bindings from wrangler.jsonc, which Miniflare simulates.
import { env, exports } from "cloudflare:workers"
import * as v from "valibot"
import { beforeEach, describe, expect, it } from "vitest"
import { ApiErrorSchema } from "@contracts/api/errors"
import worker from "../index"
import { RATE_LIMIT_PERIOD } from "./rate-limit"

// `simple.limit` of each binding in wrangler.jsonc.
const API_LIMIT = 100
const ADMIN_WRITE_LIMIT = 60
const UPLOAD_LIMIT = 20

// Every test sends from its own IP, so counts don't carry over.
let lastOctet = 0
const nextIp = () => `203.0.113.${++lastOctet}`

// Miniflare's windows follow the wall clock: start each test well inside one,
// so a burst isn't split across two.
beforeEach(async () => {
  const left =
    RATE_LIMIT_PERIOD * 1000 - (Date.now() % (RATE_LIMIT_PERIOD * 1000))
  if (left < 15_000) await new Promise((done) => setTimeout(done, left + 100))
}, 20_000)

function request(
  path: string,
  ip: string | undefined,
  init: RequestInit = {},
  origin = "https://webrunner.dev"
) {
  const headers = new Headers(init.headers)
  if (ip) headers.set("CF-Connecting-IP", ip)
  return exports.default.fetch(`${origin}${path}`, { ...init, headers })
}

// Sends `count` requests one after another and returns their statuses.
async function statuses(count: number, send: () => Promise<Response>) {
  const result: number[] = []
  for (let i = 0; i < count; i++) {
    const response = await send()
    await response.body?.cancel()
    result.push(response.status)
  }
  return result
}

async function expectLimited(response: Response) {
  expect(response.status).toBe(429)
  expect(response.headers.get("Retry-After")).toBe(String(RATE_LIMIT_PERIOD))
  const body = await response.json()
  expect(v.is(ApiErrorSchema, body)).toBe(true)
  expect(body).toEqual({ error: "too_many_requests" })
}

// A burst of a hundred requests takes a few seconds, more on a cold start.
describe("rate limit on /api/*", { timeout: 30_000 }, () => {
  it("answers 429 with Retry-After once an IP passes the limit on a path", async () => {
    const ip = nextIp()
    const passed = await statuses(API_LIMIT, () => request("/api/health", ip))
    expect(passed.every((status) => status === 200)).toBe(true)
    await expectLimited(await request("/api/health", ip))
  })

  it("counts reads per path and per IP", async () => {
    const ip = nextIp()
    await statuses(API_LIMIT, () => request("/api/health", ip))
    expect((await request("/api/health", ip)).status).toBe(429)
    // The same IP on another path, and another IP on the same path.
    expect((await request("/api/public/en/tracks", ip)).status).toBe(200)
    expect((await request("/api/health", nextIp())).status).toBe(200)
  })

  it("limits uploads harder, before the Access check", async () => {
    const ip = nextIp()
    const upload = () =>
      request("/api/admin/uploads", ip, { method: "POST", body: "x" })
    const passed = await statuses(UPLOAD_LIMIT, upload)
    expect(passed.every((status) => status === 401)).toBe(true)
    await expectLimited(await upload())
  })

  it("limits admin writes per IP across paths, but not reads", async () => {
    const ip = nextIp()
    let id = 0
    const write = () =>
      request(`/api/admin/posts/${++id}`, ip, { method: "PATCH", body: "{}" })
    const passed = await statuses(ADMIN_WRITE_LIMIT, write)
    expect(passed.every((status) => status === 401)).toBe(true)
    await expectLimited(await write())
    expect((await request("/api/admin/posts", ip)).status).toBe(401)
  })

  it("leaves requests without CF-Connecting-IP and on localhost alone", async () => {
    const ip = nextIp()
    const all = [
      ...(await statuses(API_LIMIT + 1, () =>
        request("/api/health", undefined)
      )),
      ...(await statuses(API_LIMIT + 1, () =>
        request("/api/health", ip, {}, "http://localhost:5173")
      )),
    ]
    expect(all.every((status) => status === 200)).toBe(true)
  })

  // The test project has no build output, so ASSETS is a stand-in.
  const withAssets = {
    ...env,
    ASSETS: {
      fetch: async () =>
        new Response("<!doctype html><html><head></head></html>", {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    },
  } as unknown as Env

  it("doesn't touch pages and static files", async () => {
    const ip = nextIp()
    const visit = (path: string) => () =>
      worker.fetch(
        new Request(`https://webrunner.dev${path}`, {
          headers: { "CF-Connecting-IP": ip },
        }),
        withAssets,
        {} as ExecutionContext
      )
    const all = [
      ...(await statuses(API_LIMIT + 1, visit("/en"))),
      ...(await statuses(API_LIMIT + 1, visit("/favicon.svg"))),
    ]
    expect(all.every((status) => status === 200)).toBe(true)
  })
})
