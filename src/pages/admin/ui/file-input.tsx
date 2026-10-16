import { useState, type ComponentProps } from "react"

import { Input } from "@/shared/ui/kit"

import { AdminApiError, uploadFile, type Values } from "../api/admin-api"
import { errorMessage } from "./api-error-notice"

// An audio file's length in whole seconds, read by the browser.
function audioDuration(file: File) {
  return new Promise<number | undefined>((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    const done = (seconds?: number) => {
      URL.revokeObjectURL(url)
      resolve(seconds)
    }
    audio.preload = "metadata"
    audio.onloadedmetadata = () =>
      done(
        Number.isFinite(audio.duration) ? Math.round(audio.duration) : undefined
      )
    audio.onerror = () => done()
    audio.src = url
  })
}

// Uploads the chosen file to R2 at once; the field's value is its key.
// Progress, preview and replacing come with the editor (#35).
export function FileInput({
  accept,
  fills,
  value,
  onChange,
  onUploaded,
  ...props
}: Omit<ComponentProps<"input">, "onChange" | "value" | "type"> & {
  accept: string
  fills?: "image-size" | "audio-duration"
  value: string
  onChange: (key: string) => void
  onUploaded: (key: string, extra: Values) => void
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle")
  const [error, setError] = useState<string>()

  async function upload(file: File) {
    setStatus("uploading")
    try {
      const result = await uploadFile(file)
      const extra: Values = {}
      if (fills === "image-size") {
        extra.width = result.width
        extra.height = result.height
      }
      if (fills === "audio-duration") {
        const seconds = await audioDuration(file)
        if (seconds) extra.durationSeconds = String(seconds)
      }
      onChange(result.key)
      onUploaded(result.key, extra)
      setStatus("idle")
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? errorMessage(caught)
          : "Upload failed."
      )
      setStatus("error")
    }
  }

  return (
    <div className="flex flex-col gap-zsd-xs">
      <Input
        {...props}
        type="file"
        accept={accept}
        disabled={status === "uploading"}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      <p aria-live="polite" className="text-zsd-body-sm text-muted-foreground">
        {status === "uploading" && "Uploading…"}
        {status === "idle" && value && (
          <>
            Uploaded: <code className="break-all">{value}</code>
          </>
        )}
        {status === "error" && <span className="text-zsd-error">{error}</span>}
      </p>
    </div>
  )
}
