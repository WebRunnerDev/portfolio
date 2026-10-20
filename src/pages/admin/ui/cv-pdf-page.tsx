import { useState } from "react"

import type { CvPdf } from "@contracts/api/admin"
import { cvPdfPath, printCvPath } from "@contracts/cv-pdf"
import { LANGS, type Lang } from "@contracts/lang"
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/kit"

import {
  AdminApiError,
  generateCvPdf,
  listCvPdfs,
  uploadCvPdf,
} from "../api/admin-api"
import { useResource } from "../model/use-resource"
import { ApiErrorNotice, errorMessage } from "./api-error-notice"

const LINK =
  "underline-offset-4 outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })

// The CV PDF of each Lang (ADR-0003): generated from the Print CV by Browser
// Rendering, or uploaded by hand when that fails. Either replaces the file
// at /{lang}/cv.pdf. Previews have no Access, so this works on webrunner.dev
// and locally only.
export function CvPdfPage() {
  const pdfs = useResource("cv-pdf", listCvPdfs)
  const byLang = new Map(pdfs.data?.map((pdf) => [pdf.lang, pdf]))

  return (
    <>
      <h1 className="font-heading text-zsd-headline-md">CV PDF</h1>
      <p className="max-w-prose text-zsd-body-sm text-muted-foreground">
        Generate prints the Print CV of the Lang on one A4 page. Langs without a
        PDF link the EN one from the Web CV. A new file shows up on the site
        within a minute.
      </p>
      {pdfs.error && (
        <ApiErrorNotice error={pdfs.error} onRetry={pdfs.reload} />
      )}
      <div aria-busy={pdfs.loading} className="min-w-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lang</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {LANGS.map((lang) => (
              <CvPdfRow
                key={lang}
                lang={lang}
                pdf={byLang.get(lang)}
                loading={pdfs.loading && !pdfs.data}
                onChanged={pdfs.reload}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function CvPdfRow({
  lang,
  pdf,
  loading,
  onChanged,
}: {
  lang: Lang
  pdf: CvPdf | undefined
  loading: boolean
  onChanged: () => void
}) {
  const [busy, setBusy] = useState<"generating" | "uploading">()
  const [error, setError] = useState<string>()

  async function run(kind: typeof busy, send: () => Promise<unknown>) {
    setBusy(kind)
    setError(undefined)
    try {
      await send()
      onChanged()
    } catch (caught) {
      setError(
        caught instanceof AdminApiError ? errorMessage(caught) : "Failed."
      )
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <TableRow data-testid={`cv-pdf-${lang}`}>
      <TableCell className="font-medium uppercase">{lang}</TableCell>
      <TableCell>
        {pdf ? (
          <time dateTime={pdf.generatedAt}>{formatDate(pdf.generatedAt)}</time>
        ) : (
          <span className="text-muted-foreground">{loading ? "…" : "—"}</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-zsd-xs">
          {pdf && (
            // The date in the query skips a copy cached before this one.
            <a
              href={`${cvPdfPath(lang)}?v=${encodeURIComponent(pdf.generatedAt)}`}
              target="_blank"
              rel="noreferrer"
              className={LINK}
            >
              {cvPdfPath(lang)}
            </a>
          )}
          <a
            href={printCvPath(lang)}
            target="_blank"
            rel="noreferrer"
            className={`text-zsd-body-sm text-muted-foreground ${LINK}`}
          >
            Print CV
          </a>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex min-w-72 flex-col gap-zsd-xs">
          <div className="flex flex-wrap items-center gap-zsd-sm">
            <Button
              size="sm"
              disabled={!!busy}
              onClick={() => void run("generating", () => generateCvPdf(lang))}
            >
              {busy === "generating" ? "Generating…" : "Generate"}
            </Button>
            <Input
              type="file"
              accept="application/pdf"
              aria-label={`Upload a PDF by hand (${lang.toUpperCase()})`}
              disabled={!!busy}
              className="min-w-0 flex-1"
              onChange={(event) => {
                const file = event.target.files?.[0]
                // The same file can be picked again after a failure.
                event.target.value = ""
                if (file) void run("uploading", () => uploadCvPdf(lang, file))
              }}
            />
          </div>
          <p
            aria-live="polite"
            className="text-zsd-body-sm text-muted-foreground"
          >
            {busy === "uploading" && "Uploading…"}
            {error && <span className="text-zsd-error">{error}</span>}
          </p>
        </div>
      </TableCell>
    </TableRow>
  )
}
