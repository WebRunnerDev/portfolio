import * as v from "valibot"
import { LANGS, type Lang } from "../lang"

// POST /api/admin/translate — a draft Translation from EN (worker/README.md ›
// Translation draft). The admin sends the EN values of one form; the answer
// holds the same fields in `lang`, unsaved: the owner edits and saves them.

// Every Lang but EN, which is what gets translated.
export const DRAFT_LANGS = LANGS.filter(
  (lang): lang is Exclude<Lang, "en"> => lang !== "en"
)

export type DraftLang = (typeof DRAFT_LANGS)[number]

// A text field, or a list of lines (bullets).
const Value = v.union([
  v.pipe(v.string(), v.nonEmpty()),
  v.pipe(v.array(v.pipe(v.string(), v.nonEmpty())), v.nonEmpty()),
])

const FieldName = v.pipe(v.string(), v.regex(/^[a-zA-Z]+$/, "Expected a name"))

// `markdown`: its code, links and URLs come back untouched.
const DraftFieldSchema = v.strictObject({
  name: FieldName,
  value: Value,
  markdown: v.optional(v.boolean(), false),
})

export const TranslateRequestSchema = v.strictObject({
  lang: v.picklist(DRAFT_LANGS),
  fields: v.pipe(
    v.array(DraftFieldSchema),
    v.nonEmpty(),
    v.check(
      (fields) =>
        new Set(fields.map((field) => field.name)).size === fields.length,
      "Field names must be unique"
    )
  ),
})

export type TranslateRequest = v.InferInput<typeof TranslateRequestSchema>

// Each field of the request by name, a list as a list.
export const TranslateResponseSchema = v.object({
  fields: v.record(FieldName, v.union([v.string(), v.array(v.string())])),
})

export type TranslateResponse = v.InferOutput<typeof TranslateResponseSchema>
