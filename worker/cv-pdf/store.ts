import type { CvPdf } from "@contracts/api/admin"
import type { CvPdfLink } from "@contracts/api/public"
import { cvPdfKey } from "@contracts/cv-pdf"
import type { Lang } from "@contracts/lang"

// The CV PDF of a Lang: the file under `cvPdfKey(lang)` in R2 and its row in
// `cv_pdf`. Generated and uploaded ones are stored the same way.

type Row = { lang: Lang; generated_at: string }

const toCvPdf = (row: Row): CvPdf => ({
  lang: row.lang,
  generatedAt: row.generated_at,
})

// Writes the file, then the row, so the row never names a file that isn't
// there yet.
export async function saveCvPdf(
  env: Env,
  lang: Lang,
  bytes: Uint8Array
): Promise<CvPdf> {
  const key = cvPdfKey(lang)
  await env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: "application/pdf" },
  })
  const row = await env.DB.prepare(
    `INSERT INTO cv_pdf (lang, r2_key) VALUES (?1, ?2)
    ON CONFLICT (lang) DO UPDATE SET r2_key = excluded.r2_key,
      generated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    RETURNING lang, generated_at`
  )
    .bind(lang, key)
    .first<Row>()
  if (!row) throw new Error("cv_pdf upsert returned no row")
  return toCvPdf(row)
}

export async function listCvPdfs(db: D1Database): Promise<CvPdf[]> {
  const { results } = await db
    .prepare("SELECT lang, generated_at FROM cv_pdf")
    .all<Row>()
  return results.map(toCvPdf)
}

// The Lang's own CV PDF, else the EN one (CONTEXT.md › Fallback).
export async function findCvPdfLink(
  db: D1Database,
  lang: Lang
): Promise<CvPdfLink | null> {
  const row = await db
    .prepare(
      `SELECT lang, generated_at FROM cv_pdf WHERE lang IN (?1, 'en')
      ORDER BY lang = ?1 DESC LIMIT 1`
    )
    .bind(lang)
    .first<Row>()
  return row && { ...toCvPdf(row), fallback: row.lang !== lang }
}
