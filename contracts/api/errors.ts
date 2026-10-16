import * as v from "valibot"

// Every /api/* error is `{ "error": "<code>" }` with the matching HTTP status
// (worker/README.md › API).
export const API_ERROR_CODES = [
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "method_not_allowed",
  "conflict",
  "payload_too_large",
  "unsupported_media_type",
  "validation_failed",
  "too_many_requests",
  "internal_error",
] as const

export const ApiErrorSchema = v.object({ error: v.picklist(API_ERROR_CODES) })

export type ApiError = v.InferOutput<typeof ApiErrorSchema>

export type ApiErrorCode = ApiError["error"]

// 422 from /api/admin/*: the body didn't match the schema. `fields` maps the
// dot path of each bad field (`translations.en.title`; "" for the body
// itself) to its messages.
export const ValidationErrorSchema = v.object({
  error: v.literal("validation_failed"),
  fields: v.record(v.string(), v.array(v.string())),
})

export type ValidationError = v.InferOutput<typeof ValidationErrorSchema>
