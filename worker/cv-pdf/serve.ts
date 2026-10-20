import { cvPdfFilename, cvPdfKey } from "@contracts/cv-pdf"
import { isLang, type Lang } from "@contracts/lang"
import { serveObject } from "../media/serve"

// GET /{lang}/cv.pdf: the Lang's CV PDF from R2, opened in the browser's
// viewer. 404 while the Lang has none; the Web CV links the EN one then.

const PATH = /^\/([^/]+)\/cv\.pdf$/

// The Lang of a /{lang}/cv.pdf path, or undefined for any other path.
export function cvPdfLang(pathname: string): Lang | undefined {
  const lang = PATH.exec(pathname)?.[1]
  return isLang(lang) ? lang : undefined
}

export async function serveCvPdf(request: Request, env: Env, lang: Lang) {
  // The key never changes, so `serveObject` caches it for a minute only.
  const response = await serveObject(request, env, cvPdfKey(lang))
  if (response.ok) {
    response.headers.set(
      "Content-Disposition",
      `inline; filename="${cvPdfFilename(lang)}"`
    )
  }
  return response
}
