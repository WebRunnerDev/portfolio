import type { Context, Handler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type {
  ApiError,
  ApiErrorCode,
  ValidationError,
} from "@contracts/api/errors"

export function apiError(
  c: Context,
  status: ContentfulStatusCode,
  error: ApiErrorCode
) {
  return c.json({ error } satisfies ApiError, status)
}

// 422 with the bad fields (ValidationErrorSchema in contracts/api/errors.ts).
export function validationFailed(
  c: Context,
  fields: ValidationError["fields"]
) {
  return c.json(
    { error: "validation_failed", fields } satisfies ValidationError,
    422
  )
}

// The last handler of a route module: any method it doesn't define gets 405.
export function methodNotAllowed(allow: string): Handler {
  return (c) => {
    c.header("Allow", allow)
    return apiError(c, 405, "method_not_allowed")
  }
}

// Hook for `sValidator` from @hono/standard-validator: a request that doesn't
// match the contracts/ schema gets 400 without the validation issues.
export function rejectInvalid(result: { success: boolean }, c: Context) {
  if (!result.success) return apiError(c, 400, "invalid_request")
}

// A Standard Schema issue, as @hono/standard-validator passes it.
type Issue = {
  message: string
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>
}

type ValidationResult =
  { success: true } | { success: false; error: readonly Issue[] }

// The same for /api/admin/* bodies, which the admin forms show field by field:
// 422 with the issues by dot path.
export function rejectInvalidFields(result: ValidationResult, c: Context) {
  if (result.success) return
  const fields: ValidationError["fields"] = {}
  for (const issue of result.error) {
    const path = (issue.path ?? [])
      .map((segment) =>
        typeof segment === "object" ? String(segment.key) : String(segment)
      )
      .join(".")
    ;(fields[path] ??= []).push(issue.message)
  }
  return validationFailed(c, fields)
}

const snakeToCamel = (name: string) =>
  name.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase())

// D1 constraint failures that are the client's doing rather than a bug: a
// taken unique value (the field, camelCase) or a row still referenced.
export function constraintViolation(err: unknown) {
  const message = err instanceof Error ? err.message : ""
  const unique = /UNIQUE constraint failed: \w+\.(\w+)/.exec(message)
  if (unique) return { unique: snakeToCamel(unique[1]) }
  if (message.includes("FOREIGN KEY constraint failed")) {
    return { foreignKey: true }
  }
  return undefined
}
