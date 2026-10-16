import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { apiError, constraintViolation, validationFailed } from "./errors"

export type ApiEnv = { Bindings: Env }

// A Hono app that answers misses and failures in the API error format.
export function createApp() {
  return new Hono<ApiEnv>()
    .notFound((c) => apiError(c, 404, "not_found"))
    .onError((err, c) => {
      // Hono's validator throws this on a malformed body.
      if (err instanceof HTTPException && err.status === 400) {
        return apiError(c, 400, "invalid_request")
      }
      // A write that D1 refused: a taken slug, or a row still in use.
      const violation = constraintViolation(err)
      if (violation?.unique) {
        return validationFailed(c, { [violation.unique]: ["Already taken"] })
      }
      if (violation?.foreignKey) return apiError(c, 409, "conflict")
      // Details go to Workers Logs, never to the client.
      console.error(err)
      return apiError(c, 500, "internal_error")
    })
}
