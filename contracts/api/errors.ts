import * as v from "valibot"

// Every /api/* error is `{ "error": "<code>" }` with the matching HTTP status
// (worker/README.md › API).
export const API_ERROR_CODES = [
  "invalid_request",
  "unauthorized",
  "not_found",
  "method_not_allowed",
  "internal_error",
] as const

export const ApiErrorSchema = v.object({ error: v.picklist(API_ERROR_CODES) })

export type ApiError = v.InferOutput<typeof ApiErrorSchema>

export type ApiErrorCode = ApiError["error"]
