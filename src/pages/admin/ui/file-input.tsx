import { useState, type ComponentProps } from "react"
import { mediaUrl } from "@contracts/media"

import { Button, Input } from "@/shared/ui/kit"

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

// The stored file, by the kind its key starts with (`image/<uuid>.jpg`).
function Preview({ fileKey }: { fileKey: string }) {
  const url = mediaUrl(fileKey)
  if (fileKey.startsWith("image/")) {
    return (
      <img
        src={url}
        alt="Preview"
        className="max-h-40 w-auto max-w-full self-start rounded-md border border-border object-contain"
      />
    )
  }
  if (fileKey.startsWith("audio/")) {
    return <audio controls preload="metadata" src={url} className="w-full" />
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="self-start underline-offset-4 hover:underline"
    >
      Open the file
    </a>
  )
}

// Uploads the chosen file to R2 at once; the field's value is its key.
// Choosing another file replaces it, Remove clears an optional one. The old
// file stays in R2 until the form is saved (the row still names it).
export function FileInput({
  accept,
  fills,
  value,
  required,
  onChange,
  onUploaded,
  ...props
}: Omit<ComponentProps<"input">, "onChange" | "value" | "type" | "required"> & {
  accept: string
  fills?: "image-size" | "audio-duration"
  value: string
  required: boolean
  onChange: (key: string) => void
  onUploaded: (key: string, extra: Values) => void
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string>()

  async function upload(file: File) {
    setStatus("uploading")
    setProgress(0)
    try {
      const result = await uploadFile(file, setProgress)
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

  const percent = Math.round(progress * 100)

  return (
    <div className="flex flex-col gap-zsd-xs">
      {value && <Preview fileKey={value} />}
      <div className="flex flex-wrap items-center gap-zsd-sm">
        <Input
          {...props}
          type="file"
          accept={accept}
          className="min-w-0 flex-1"
          disabled={status === "uploading"}
          onChange={(event) => {
            const file = event.target.files?.[0]
            // The same file can be picked again after a failure.
            event.target.value = ""
            if (file) void upload(file)
          }}
        />
        {value && !required && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={status === "uploading"}
            onClick={() => onChange("")}
          >
            Remove
          </Button>
        )}
      </div>
      {status === "uploading" && (
        <progress
          max={100}
          value={percent}
          aria-label="Upload progress"
          className="h-1.5 w-full accent-primary"
        />
      )}
      <p aria-live="polite" className="text-zsd-body-sm text-muted-foreground">
        {status === "uploading" && `Uploading… ${percent}%`}
        {status === "idle" && value && (
          <code className="break-all">{value}</code>
        )}
        {status === "error" && <span className="text-zsd-error">{error}</span>}
      </p>
    </div>
  )
}
