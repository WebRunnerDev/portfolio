import { CircleAlert } from "lucide-react"

import { Button } from "@/shared/ui/kit"

import type { AdminApiError } from "../api/admin-api"

const MESSAGES: Partial<Record<AdminApiError["code"], string>> = {
  network_error:
    "No answer from the API. If the Access session has expired, reload the page to sign in again.",
  unauthorized: "Not signed in. Reload the page to sign in through Access.",
  not_found: "Not found.",
  conflict:
    "Still in use: remove what points at it first (an album's photos, a file a row names).",
  validation_failed: "Some fields are invalid.",
  payload_too_large: "The file is too large.",
  unsupported_media_type: "This file type isn't allowed.",
  bad_response:
    "The API answered something unexpected. Details are in the console.",
}

export function errorMessage(error: AdminApiError) {
  return MESSAGES[error.code] ?? `Request failed (${error.code}).`
}

export function ApiErrorNotice({
  error,
  onRetry,
}: {
  error: AdminApiError
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-zsd-sm border border-zsd-error px-zsd-md py-zsd-sm text-zsd-body-sm text-zsd-error"
    >
      <CircleAlert aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{errorMessage(error)}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
