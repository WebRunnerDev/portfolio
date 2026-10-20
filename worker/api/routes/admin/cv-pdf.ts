import { Hono, type Context } from "hono"
import type { CvPdf } from "@contracts/api/admin"
import { printCvPath } from "@contracts/cv-pdf"
import { isLang } from "@contracts/lang"
import { MAX_UPLOAD_BYTES } from "@contracts/media"
import { RenderError, renderPdf } from "../../../cv-pdf/render"
import { listCvPdfs, saveCvPdf } from "../../../cv-pdf/store"
import { sniffMedia } from "../../../media/sniff"
import type { AdminEnv } from "../../access"
import { apiError, methodNotAllowed } from "../../errors"

// /api/admin/cv-pdf (worker/README.md › CV PDF): the CV PDF of each Lang.
// POST /:lang prints the Print CV through Browser Rendering (ADR-0003),
// PUT /:lang stores a PDF uploaded by hand, the ADR's fallback. Both replace
// the same R2 key and `cv_pdf` row.

const LANG = "/:lang"

const langOf = (c: Context) => {
  const lang = c.req.param("lang")
  return isLang(lang) ? lang : undefined
}

export const cvPdfAdmin = new Hono<AdminEnv>()
  .get("/", async (c) => c.json((await listCvPdfs(c.env.DB)) satisfies CvPdf[]))
  .all("/", methodNotAllowed("GET, HEAD"))
  // The browser opens the Print CV on the origin the admin is on: the site
  // itself on webrunner.dev, the dev server locally.
  .post(LANG, async (c) => {
    const lang = langOf(c)
    if (!lang) return apiError(c, 400, "invalid_request")
    const url = new URL(printCvPath(lang), c.req.url).href
    let pdf: Uint8Array
    try {
      pdf = await renderPdf(c.env.BROWSER, url)
    } catch (err) {
      if (!(err instanceof RenderError)) throw err
      console.error({ message: "cv-pdf-render", lang, url, err: err.cause })
      return err.code === "browser_unavailable"
        ? apiError(c, 503, "browser_unavailable")
        : apiError(c, 502, "render_failed")
    }
    return c.json((await saveCvPdf(c.env, lang, pdf)) satisfies CvPdf)
  })
  // The raw PDF as the body, checked by its bytes like any upload.
  .put(LANG, async (c) => {
    const lang = langOf(c)
    if (!lang) return apiError(c, 400, "invalid_request")
    const bytes = new Uint8Array(await c.req.arrayBuffer())
    if (bytes.length === 0) return apiError(c, 400, "invalid_request")
    if (sniffMedia(bytes)?.type !== "application/pdf") {
      return apiError(c, 415, "unsupported_media_type")
    }
    if (bytes.length > MAX_UPLOAD_BYTES.pdf) {
      return apiError(c, 413, "payload_too_large")
    }
    return c.json((await saveCvPdf(c.env, lang, bytes)) satisfies CvPdf)
  })
  .all(LANG, methodNotAllowed("POST, PUT"))
