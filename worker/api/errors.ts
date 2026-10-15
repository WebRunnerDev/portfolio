import type { Context, Handler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { ApiError, ApiErrorCode } from "@contracts/api/errors"

export function apiError(
  c: Context,
  status: ContentfulStatusCode,
  error: ApiErrorCode
) {
  return c.json({ error } satisfies ApiError, status)
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
