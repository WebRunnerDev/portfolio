// Runs in workerd, through the whole Worker: paths without a Lang (`/`,
// `/cv`, `/nope`) and the Admin's pages. ASSETS is a stand-in with
// index.html and one static file, since the test project has no build output.
import { env } from "cloudflare:workers"
import { describe, expect, it } from "vitest"
import worker from "../index"

const INDEX_HTML = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title data-meta>WebRunner</title></head><body><div id="root"></div></body></html>`

const testEnv = {
  ...env,
  ASSETS: {
    async fetch(input: RequestInfo | URL, init?: RequestInit) {
      const request = new Request(input, init)
      if (new URL(request.url).pathname === "/favicon.svg") {
        return new Response("<svg/>", {
          headers: { "Content-Type": "image/svg+xml" },
        })
      }
      return new Response(request.method === "HEAD" ? null : INDEX_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    },
  },
} as unknown as Env

function visit(
  path: string,
  { method, headers }: { method?: string; headers?: HeadersInit } = {}
) {
  return worker.fetch(
    new Request(`https://webrunner.dev${path}`, { method, headers }),
    testEnv,
    {} as ExecutionContext
  )
}

describe("/", () => {
  it("redirects to EN without a cookie or Accept-Language", async () => {
    const response = await visit("/")
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/en")
    expect(response.headers.get("Vary")).toBe("Cookie, Accept-Language")
  })

  it("follows Accept-Language, and the cookie wins over it", async () => {
    const de = await visit("/", {
      headers: { "Accept-Language": "fr-FR,de;q=0.8,ru;q=0.5" },
    })
    expect(de.headers.get("Location")).toBe("/de")
    const kk = await visit("/", {
      headers: { "Accept-Language": "de", Cookie: "theme=dark; lang=kk" },
    })
    expect(kk.headers.get("Location")).toBe("/kk")
  })

  it("keeps the query", async () => {
    const response = await visit("/?utm_source=cv")
    expect(response.headers.get("Location")).toBe("/en?utm_source=cv")
  })

  it("redirects HEAD the same way", async () => {
    const response = await visit("/", { method: "HEAD" })
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/en")
  })
})

describe("a path without a Lang", () => {
  it("redirects to the same page on the visitor's Lang", async () => {
    const headers = { "Accept-Language": "ru-RU" }
    for (const [path, location] of [
      ["/cv", "/ru/cv"],
      ["/projects/", "/ru/projects"],
      ["/fr/design", "/ru/design"],
    ]) {
      const response = await visit(path, { headers })
      expect(response.status, path).toBe(302)
      expect(response.headers.get("Location"), path).toBe(location)
    }
  })

  it("is a 404 with the Not Found page on the visitor's Lang when that is no page", async () => {
    for (const path of ["/nope", "/projects/missing", "/administrator"]) {
      const response = await visit(path, {
        headers: { "Accept-Language": "ru" },
      })
      expect(response.status, path).toBe(404)
      expect(response.headers.get("Vary")).toBe("Cookie, Accept-Language")
      const html = await response.text()
      expect(html).toContain('<html lang="ru" dir="ltr">')
      expect(html).toContain("Страница не найдена · WebRunner")
      expect(html).toContain('<meta data-meta name="robots" content="noindex">')
      // Still an HTML answer: the security headers and the CSP.
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
      expect(response.headers.has("Content-Security-Policy-Report-Only")).toBe(
        true
      )
    }
  })

  it("leaves static files alone", async () => {
    const response = await visit("/favicon.svg")
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("<svg/>")
  })
})

describe("the Admin", () => {
  it.each(["/admin", "/admin/posts/1"])(
    "%s is the SPA with noindex",
    async (path) => {
      const response = await visit(path)
      expect(response.status).toBe(200)
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex")
      expect(await response.text()).toContain('<div id="root">')
    }
  )
})
