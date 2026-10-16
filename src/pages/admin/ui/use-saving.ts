import { useState } from "react"

import { AdminApiError } from "../api/admin-api"
import { hasErrors, type FieldErrors } from "../lib/form"
import { errorMessage } from "./api-error-notice"

// One save of a form: the errors the browser found, then the request, whose
// 422 lands on the fields and anything else in `failure`.
export function useSaving() {
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failure, setFailure] = useState<string>()
  const [saved, setSaved] = useState(false)

  async function save(found: FieldErrors, send: () => Promise<void>) {
    setErrors(found)
    setFailure(undefined)
    setSaved(false)
    if (hasErrors(found)) return
    setPending(true)
    try {
      await send()
      setSaved(true)
    } catch (caught) {
      if (caught instanceof AdminApiError && hasErrors(caught.fields)) {
        setErrors(caught.fields)
      } else {
        setFailure(
          caught instanceof AdminApiError ? errorMessage(caught) : "Failed."
        )
      }
    } finally {
      setPending(false)
    }
  }

  return { pending, errors, failure, saved, save }
}
