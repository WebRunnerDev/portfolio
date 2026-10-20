import { useEffect, useId, useRef, useState, type DragEvent } from "react"
import { CircleAlert, CircleCheck, RotateCw, X } from "lucide-react"
import type { UploadResponse } from "@contracts/api/admin"

import { Button, Input, Label } from "@/shared/ui/kit"
import { cn } from "@/shared/lib/utils"

import {
  AdminApiError,
  createRow,
  deleteUpload,
  listRows,
  uploadFile,
} from "../api/admin-api"
import type { EntityConfig, Field } from "../model/entities"
import {
  UploadQueue,
  type UploadItem,
  type UploadSnapshot,
} from "../model/upload-queue"
import { useResource } from "../model/use-resource"
import { ApiErrorNotice, errorMessage } from "./api-error-notice"
import { EntityTable } from "./entity-table"

// Uploads at once; more would only queue up behind the Worker.
const CONCURRENCY = 3
// The API's Retry-After on a 429 (worker/api/rate-limit.ts).
const RATE_LIMIT_PAUSE_MS = 60_000

const STATUS_TEXT: Record<UploadItem["status"], string> = {
  queued: "Waiting",
  uploading: "Uploading",
  saving: "Saving",
  done: "Done",
  failed: "Failed",
}

// The rows of `child` (an album's photos) under the editor of their parent
// row, and a drop zone that uploads many files at once: each file goes to
// R2, then becomes a row at the end of the list, in the order chosen.
export function GallerySection({
  child,
  parentId,
}: {
  child: EntityConfig
  parentId: string
}) {
  const scope = child.scope!
  const file = child.fields.find(
    (field): field is Extract<Field, { kind: "file" }> => field.kind === "file"
  )!
  const rows = useResource(`${child.path}?${parentId}`, () =>
    listRows(child.path, child.schemas.entity, { [scope.field]: parentId })
  )
  const [snapshot, setSnapshot] = useState<UploadSnapshot>({
    items: [],
    paused: false,
  })
  const queue = useRef<UploadQueue<UploadResponse>>(undefined)
  const { reload } = rows

  useEffect(() => {
    // Saved since the list was last loaded; it loads again once the queue
    // has nothing left to do.
    let unlisted = 0
    const current = new UploadQueue<UploadResponse>({
      concurrency: CONCURRENCY,
      upload: uploadFile,
      save: async (result) => {
        await createRow(child.path, child.schemas.entity, {
          [scope.field]: Number(parentId),
          [file.name]: result.key,
          ...(file.fills === "image-size" && {
            width: result.width,
            height: result.height,
          }),
        })
        unlisted++
      },
      discard: (result) => void deleteUpload(result.key).catch(() => {}),
      isRateLimited: (error) =>
        error instanceof AdminApiError && error.status === 429,
      describe: (error) =>
        error instanceof AdminApiError ? errorMessage(error) : "Failed.",
      pauseMs: RATE_LIMIT_PAUSE_MS,
      onChange: (next) => {
        setSnapshot(next)
        const busy = next.items.some(
          (item) => item.status !== "done" && item.status !== "failed"
        )
        if (!busy && unlisted > 0) {
          unlisted = 0
          reload()
        }
      },
    })
    queue.current = current
    return () => current.dispose()
  }, [child, scope.field, file, parentId, reload])

  const total = snapshot.items.length
  const done = snapshot.items.filter((item) => item.status === "done").length
  const failed = snapshot.items.filter((item) => item.status === "failed")

  return (
    <div className="flex flex-col gap-zsd-md">
      <DropZone
        accept={file.accept}
        label={`Add ${child.label.toLowerCase()}`}
        onFiles={(files) => queue.current?.add(files)}
      />
      <p
        aria-live="polite"
        className="text-zsd-body-sm text-muted-foreground empty:hidden"
      >
        {total > 0 && `Uploaded ${done} of ${total}.`}
        {failed.length > 0 && ` Failed: ${failed.length}.`}
        {snapshot.paused &&
          " Too many uploads for now: going on in a minute by itself."}
      </p>
      {total > 0 && (
        <div className="flex flex-col gap-zsd-sm">
          <ul
            aria-label="Uploads"
            className="flex max-h-80 flex-col overflow-y-auto border border-border"
          >
            {snapshot.items.map((item) => (
              <UploadRow
                key={item.id}
                item={item}
                onRetry={() => queue.current?.retry(item.id)}
                onDismiss={() => queue.current?.dismiss(item.id)}
              />
            ))}
          </ul>
          <div className="flex flex-wrap gap-zsd-sm">
            {failed.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  for (const item of failed) queue.current?.retry(item.id)
                }}
              >
                Retry all failed
              </Button>
            )}
            {done > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => queue.current?.clearDone()}
              >
                Clear finished
              </Button>
            )}
          </div>
        </div>
      )}
      {rows.error && <ApiErrorNotice error={rows.error} onRetry={reload} />}
      {rows.data && (
        <div aria-busy={rows.loading} className="min-w-0 overflow-x-auto">
          <EntityTable entity={child} rows={rows.data} onChanged={reload} />
        </div>
      )}
    </div>
  )
}

// A file input that also takes files dropped anywhere on the zone.
function DropZone({
  accept,
  label,
  onFiles,
}: {
  accept: string
  label: string
  onFiles: (files: File[]) => void
}) {
  const id = useId()
  const [over, setOver] = useState(false)

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setOver(false)
    const files = [...event.dataTransfer.files]
    if (files.length > 0) onFiles(files)
  }

  return (
    <div
      data-testid="drop-zone"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
        setOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOver(false)
        }
      }}
      onDrop={onDrop}
      className={cn(
        "flex flex-col gap-zsd-xs border border-dashed border-border p-zsd-md",
        over && "border-primary bg-muted"
      )}
    >
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="file"
        multiple
        accept={accept}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          // The same files can be picked again.
          event.target.value = ""
          if (files.length > 0) onFiles(files)
        }}
      />
      <p className="text-zsd-body-sm text-muted-foreground">
        Or drop files here. They're added in the order chosen.
      </p>
    </div>
  )
}

function UploadRow({
  item,
  onRetry,
  onDismiss,
}: {
  item: UploadItem
  onRetry: () => void
  onDismiss: () => void
}) {
  const percent = Math.round(item.progress * 100)
  return (
    <li
      data-status={item.status}
      className="flex flex-wrap items-center gap-x-zsd-sm gap-y-zsd-xs border-b border-border px-zsd-sm py-zsd-xs text-zsd-body-sm last:border-b-0"
    >
      {item.status === "done" && (
        <CircleCheck aria-hidden className="size-4 shrink-0 text-primary" />
      )}
      {item.status === "failed" && (
        <CircleAlert aria-hidden className="size-4 shrink-0 text-zsd-error" />
      )}
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      {item.status === "uploading" ? (
        <progress
          max={100}
          value={percent}
          aria-label={`${item.name}: ${percent}%`}
          className="h-1.5 w-24 accent-primary"
        />
      ) : (
        <span className="text-muted-foreground">
          {STATUS_TEXT[item.status]}
        </span>
      )}
      {item.status === "failed" && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Retry ${item.name}`}
            onClick={onRetry}
          >
            <RotateCw aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Dismiss ${item.name}`}
            onClick={onDismiss}
          >
            <X aria-hidden />
          </Button>
          <span className="basis-full text-zsd-error">{item.error}</span>
        </>
      )}
    </li>
  )
}
