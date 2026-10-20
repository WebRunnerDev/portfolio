import type { Lang } from "./lang"

// The CV PDF (CONTEXT.md, ADR-0003): one file per Lang, printed from the
// Print CV by Browser Rendering or uploaded by hand, always under the same
// R2 key, so a new one replaces the old.

// Browser Rendering waits for `html[data-print-ready]` before `page.pdf()`:
// the Print CV sets it once its data is rendered and the fonts are in.
export const PRINT_READY_ATTRIBUTE = "data-print-ready"

export function cvPdfKey(lang: Lang) {
  return `cv/${lang}.pdf`
}

// Where the Worker serves it.
export function cvPdfPath(lang: Lang) {
  return `/${lang}/cv.pdf`
}

// The page Browser Rendering prints.
export function printCvPath(lang: Lang) {
  return `/${lang}/cv/print`
}

// The name a visitor saves it under.
export function cvPdfFilename(lang: Lang) {
  return `webrunner-cv-${lang}.pdf`
}
