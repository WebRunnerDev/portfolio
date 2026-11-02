import { Download } from "lucide-react"

import type { CvPdfLink as CvPdf } from "@contracts/api/public"
import { cvPdfFilename, cvPdfPath } from "@contracts/cv-pdf"
import { useT } from "@/shared/i18n"

// The CV PDF download of the Web CV (ADR-0003): the Lang's own PDF, or the
// EN one, which the label says. A plain link: the file is a page of its own.
export function CvPdfLink({ pdf }: { pdf: CvPdf }) {
  const t = useT()
  return (
    <a
      href={cvPdfPath(pdf.lang)}
      download={cvPdfFilename(pdf.lang)}
      hrefLang={pdf.lang}
      type="application/pdf"
      data-testid="cv-pdf-link"
      className="inline-flex min-h-zsd-control-height items-center gap-zsd-xs border border-zsd-outline-muted px-zsd-md text-zsd-body-md text-zsd-on-surface outline-offset-2 hover:bg-zsd-surface-raised focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Download aria-hidden="true" className="size-4 shrink-0" />
      {t(pdf.fallback ? "cv.downloadPdfEn" : "cv.downloadPdf")}
    </a>
  )
}
