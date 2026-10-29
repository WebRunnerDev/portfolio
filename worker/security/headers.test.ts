// Runs in workerd, through the whole Worker. ASSETS is a stand-in serving an
// index.html shaped like the build output, since the test project has none.
import { env } from "cloudflare:workers"
import { describe, expect, it } from "vitest"
import worker from "../index"
import { SECURITY_HEADERS } from "./headers"

const INDEX_HTML = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><script>document.documentElement.classList.add("dark")</script><title data-meta>WebRunner</title><script type="module" crossorigin src="/assets/index.js"></script><link rel="modulepreload" crossorigin href="/assets/lang.js"><link rel="modulepreload" crossorigin href="/assets/post.js" data-route="/$lang/blog/$slug"><link rel="stylesheet" crossorigin href="/assets/index.css"></head><body><div id="root"></div><script defer src="https://static.cloudflareinsights.com/beacon.min.js"></script></body></html>`

const assetRequests: Request[] = []

const testEnv = {
  ...env,
  ASSETS: {
    async fetch(input: RequestInfo | URL, init?: RequestInit) {
      const request = new Request(input, init)
      assetRequests.push(request)
      if (new URL(request.url).pathname === "/favicon.svg") {
        return new Response("<svg/>", {
          headers: { "Content-Type": "image/svg+xml", ETag: '"icon"' },
        })
      }
      return new Response(request.method === "HEAD" ? null : INDEX_HTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ETag: '"index"',
        },
      })
    },
  },
} as unknown as Env

function visit(path: string, headers: HeadersInit = {}) {
  return worker.fetch(
    new Request(`https://webrunner.dev${path}`, { headers }),
    testEnv,
    {} as ExecutionContext
  )
}

const NAVIGATION = { Accept: "text/html,application/xhtml+xml,*/*;q=0.8" }

function policyNonce(response: Response) {
  const policy = response.headers.get("Content-Security-Policy-Report-Only")
  return /'nonce-([^']+)'/.exec(policy ?? "")?.[1]
}

const nonces = (html: string) =>
  [
    ...html.matchAll(/<script\b[^>]*>|<link\b[^>]*rel="modulepreload"[^>]*>/gi),
  ].map(([tag]) => /nonce="([^"]*)"/i.exec(tag)?.[1])

describe("HTML answers", () => {
  it.each(["/en/cv", "/ar/nope", "/", "/admin", "/admin/posts/1"])(
    "%s carries the security headers and a Report-Only CSP",
    async (path) => {
      const response = await visit(path, NAVIGATION)
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        expect(response.headers.get(name)).toBe(value)
      }
      expect(response.headers.has("Content-Security-Policy")).toBe(false)
      expect(response.headers.has("Strict-Transport-Security")).toBe(false)

      const policy = response.headers.get(
        "Content-Security-Policy-Report-Only"
      )!
      for (const directive of [
        "default-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
        "connect-src 'self' https://cloudflareinsights.com",
        "report-uri /api/csp-report",
        "report-to csp",
      ]) {
        expect(policy).toContain(directive)
      }
      expect(policy).toMatch(/script-src 'nonce-[^']+' 'strict-dynamic'/)
      expect(response.headers.get("Reporting-Endpoints")).toBe(
        'csp="https://webrunner.dev/api/csp-report"'
      )
    }
  )

  it("puts the policy's nonce on every script and script preload", async () => {
    const response = await visit("/en", NAVIGATION)
    const nonce = policyNonce(response)
    const html = await response.text()

    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/)
    // The theme script, the entry, its modulepreload and the beacon.
    expect(nonces(html)).toEqual([nonce, nonce, nonce, nonce])
    expect(html).toContain(`<meta property="csp-nonce" nonce="${nonce}">`)
    // Meta Injection still runs.
    expect(html).toContain('<html lang="en" dir="ltr">')
  })

  it.each(["/", "/admin", "/en"])(
    "%s keeps no route preload that isn't its own",
    async (path) => {
      const html = await (await visit(path, NAVIGATION)).text()
      expect(html).not.toContain("/assets/post.js")
      expect(html).not.toContain("data-route")
    }
  )

  it("gives every answer a new nonce", async () => {
    const seen = new Set<string | undefined>()
    for (const path of ["/en", "/en", "/admin", "/admin"]) {
      seen.add(policyNonce(await visit(path, NAVIGATION)))
    }
    expect(seen.size).toBe(4)
  })

  it("fetches the HTML without the client's conditions and drops its ETag", async () => {
    assetRequests.length = 0
    const response = await visit("/admin", {
      ...NAVIGATION,
      "If-None-Match": '"index"',
    })
    expect(response.status).toBe(200)
    expect(assetRequests[0].headers.has("If-None-Match")).toBe(false)
    expect(response.headers.has("ETag")).toBe(false)
  })

  it("answers HEAD with the headers", async () => {
    const response = await worker.fetch(
      new Request("https://webrunner.dev/admin", { method: "HEAD" }),
      testEnv,
      {} as ExecutionContext
    )
    expect(policyNonce(response)).toBeDefined()
    expect(await response.text()).toBe("")
  })
})

describe("other answers", () => {
  it("leave static files alone, conditions included", async () => {
    assetRequests.length = 0
    const response = await visit("/favicon.svg", { "If-None-Match": '"icon"' })
    expect(assetRequests[0].headers.get("If-None-Match")).toBe('"icon"')
    expect(response.headers.get("ETag")).toBe('"icon"')
    expect(response.headers.has("Content-Security-Policy-Report-Only")).toBe(
      false
    )
  })

  it("leave the API alone", async () => {
    const response = await visit("/api/health")
    expect(response.headers.has("Content-Security-Policy-Report-Only")).toBe(
      false
    )
  })
})
