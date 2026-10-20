// Runs in workerd (the `worker` project in vite.config.ts) against the local
// D1 and R2. Browser Rendering is replaced by a fake browser; admin calls go
// through the dev bypass (localhost + ACCESS_DEV_EMAIL), /{lang}/cv.pdf
// through the whole Worker.
import { env, exports } from "cloudflare:workers"
import * as v from "valibot"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest"
import { CvPdfSchema } from "@contracts/api/admin"
import { CvPdfLinkSchema } from "@contracts/api/public"
import { MAX_UPLOAD_BYTES } from "@contracts/media"
import { api } from "../api"
import * as files from "../test/media-fixtures"
import { browsers } from "./browser"
import { cvPdfLang } from "./serve"

// Every test starts with no browser at all; `fakeBrowser()` gives it one.
let launch: MockInstance<typeof browsers.launch>

const adminEnv = { ...env, ACCESS_DEV_EMAIL: "owner@example.com" }

// What the fake browser prints, and what it was asked to do.
const PRINTED = new TextEncoder().encode("%PDF-1.7 printed")

function fakeBrowser({ ready = true } = {}) {
  const page = {
    goto: vi.fn(async () => null),
    waitForFunction: vi.fn(async () => {
      if (!ready) throw new Error("Waiting failed: 30000ms exceeded")
      return null
    }),
    pdf: vi.fn(async () => PRINTED),
  }
  const browser = {
    newPage: vi.fn(async () => page),
    close: vi.fn(async () => {}),
  }
  launch.mockResolvedValue(browser as never)
  return { browser, page }
}

function admin(method: string, path: string, body?: BodyInit) {
  return api.request(
    `http://localhost/api/admin/cv-pdf${path}`,
    { method, body },
    adminEnv
  )
}

function cvPdf(path: string, init?: RequestInit) {
  return exports.default.fetch(`https://webrunner.dev${path}`, init)
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  expect(await response.json()).toEqual({ error: code })
}

beforeEach(async () => {
  launch = vi
    .spyOn(browsers, "launch")
    .mockRejectedValue(new Error("No browser in tests"))
  await env.DB.exec("DELETE FROM cv_pdf")
  const { objects } = await env.MEDIA.list({ prefix: "cv/" })
  await Promise.all(objects.map(({ key }) => env.MEDIA.delete(key)))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("POST /api/admin/cv-pdf/:lang", () => {
  it("prints the Print CV once it is ready and stores the PDF", async () => {
    const { browser, page } = fakeBrowser()
    const response = await admin("POST", "/ru")
    expect(response.status).toBe(200)
    const body = v.parse(CvPdfSchema, await response.json())
    expect(body.lang).toBe("ru")

    expect(launch).toHaveBeenCalledWith(env.BROWSER)
    expect(page.goto).toHaveBeenCalledWith(
      "http://localhost/ru/cv/print",
      expect.anything()
    )
    expect(page.waitForFunction).toHaveBeenCalledWith(
      'document.documentElement.hasAttribute("data-print-ready")',
      expect.anything()
    )
    expect(page.pdf).toHaveBeenCalledWith({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    })
    expect(browser.close).toHaveBeenCalled()

    const stored = await env.MEDIA.get("cv/ru.pdf")
    expect(new Uint8Array(await stored!.arrayBuffer())).toEqual(PRINTED)
    expect(stored!.httpMetadata?.contentType).toBe("application/pdf")
    const row = await env.DB.prepare(
      "SELECT r2_key, generated_at FROM cv_pdf WHERE lang = 'ru'"
    ).first()
    expect(row).toEqual({ r2_key: "cv/ru.pdf", generated_at: body.generatedAt })
  })

  it("replaces the Lang's PDF and moves its date on", async () => {
    fakeBrowser()
    const first = v.parse(
      CvPdfSchema,
      await (await admin("POST", "/en")).json()
    )
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = v.parse(
      CvPdfSchema,
      await (await admin("POST", "/en")).json()
    )
    expect(second.generatedAt > first.generatedAt).toBe(true)
    const { results } = await env.DB.prepare("SELECT * FROM cv_pdf").all()
    expect(results).toHaveLength(1)
  })

  it("answers 502 and keeps the old file when the page never gets ready", async () => {
    await env.MEDIA.put("cv/en.pdf", files.pdf())
    const { browser } = fakeBrowser({ ready: false })
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    await expectError(await admin("POST", "/en"), 502, "render_failed")
    expect(browser.close).toHaveBeenCalled()
    expect(log).toHaveBeenCalled()
    expect(await env.MEDIA.head("cv/en.pdf")).not.toBeNull()
    expect(await env.DB.prepare("SELECT * FROM cv_pdf").first()).toBeNull()
  })

  it("answers 503 when no browser starts", async () => {
    launch.mockRejectedValue(new Error("429"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    await expectError(await admin("POST", "/de"), 503, "browser_unavailable")
  })

  it("answers 400 for an unknown Lang", async () => {
    fakeBrowser()
    await expectError(await admin("POST", "/fr"), 400, "invalid_request")
    expect(launch).not.toHaveBeenCalled()
  })

  it("needs Access", async () => {
    const response = await api.request(
      "http://localhost/api/admin/cv-pdf/en",
      { method: "POST" },
      env
    )
    await expectError(response, 401, "unauthorized")
  })
})

describe("PUT /api/admin/cv-pdf/:lang", () => {
  it("stores a PDF uploaded by hand under the same key", async () => {
    const response = await admin("PUT", "/kk", files.pdf())
    expect(v.parse(CvPdfSchema, await response.json()).lang).toBe("kk")
    const stored = await env.MEDIA.get("cv/kk.pdf")
    expect(new Uint8Array(await stored!.arrayBuffer())).toEqual(files.pdf())
  })

  it("refuses anything but a PDF", async () => {
    await expectError(
      await admin("PUT", "/kk", files.png(10, 10)),
      415,
      "unsupported_media_type"
    )
    await expectError(await admin("PUT", "/kk"), 400, "invalid_request")
  })

  it("refuses a PDF over the PDF limit", async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES.pdf + 1)
    big.set(files.pdf())
    await expectError(await admin("PUT", "/kk", big), 413, "payload_too_large")
  })
})

describe("GET /api/admin/cv-pdf", () => {
  it("lists the Langs that have a PDF", async () => {
    await admin("PUT", "/en", files.pdf())
    await admin("PUT", "/ar", files.pdf())
    const body = v.parse(
      v.array(CvPdfSchema),
      await (await admin("GET", "")).json()
    )
    expect(body.map(({ lang }) => lang).sort()).toEqual(["ar", "en"])
  })
})

describe("GET /api/public/:lang/cv-pdf", () => {
  const link = (lang: string) =>
    exports.default.fetch(`https://webrunner.dev/api/public/${lang}/cv-pdf`)

  it("answers the Lang's own PDF, else EN's, else 404", async () => {
    await expectError(await link("ru"), 404, "not_found")
    await admin("PUT", "/en", files.pdf())
    expect(v.parse(CvPdfLinkSchema, await (await link("ru")).json())).toEqual(
      expect.objectContaining({ lang: "en", fallback: true })
    )
    await admin("PUT", "/ru", files.pdf())
    expect(v.parse(CvPdfLinkSchema, await (await link("ru")).json())).toEqual(
      expect.objectContaining({ lang: "ru", fallback: false })
    )
  })
})

describe("GET /{lang}/cv.pdf", () => {
  it("serves the PDF inline with a short cache", async () => {
    await admin("PUT", "/en", files.pdf())
    const response = await cvPdf("/en/cv.pdf")
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("application/pdf")
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="webrunner-cv-en.pdf"'
    )
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60")
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(files.pdf())
  })

  it("answers 404 while the Lang has no PDF", async () => {
    await admin("PUT", "/en", files.pdf())
    const response = await cvPdf("/ru/cv.pdf")
    expect(response.status).toBe(404)
    await response.body?.cancel()
  })

  it("takes only /{lang}/cv.pdf of a known Lang", () => {
    expect(cvPdfLang("/ar/cv.pdf")).toBe("ar")
    expect(cvPdfLang("/fr/cv.pdf")).toBeUndefined()
    expect(cvPdfLang("/en/cv.pdf/x")).toBeUndefined()
    expect(cvPdfLang("/en/cv")).toBeUndefined()
    expect(cvPdfLang("/cv.pdf")).toBeUndefined()
  })
})
