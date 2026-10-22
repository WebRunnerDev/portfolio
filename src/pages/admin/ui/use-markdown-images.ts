import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react"
import { mediaUrl } from "@contracts/media"

import { AdminApiError, deleteUpload, uploadFile } from "../api/admin-api"
import {
  ALT_OFFSET,
  imageMarkdown,
  insertAt,
  placeholder,
  replaceIn,
  type Selection,
  type TextEdit,
} from "../lib/markdown-images"
import {
  RATE_LIMIT_PAUSE_MS,
  UPLOAD_CONCURRENCY,
  UploadQueue,
} from "../model/upload-queue"
import { errorMessage } from "./api-error-notice"

export type ImageError = { id: number; name: string; message: string }

// Unique across editors, so a placeholder copied to another tab stays apart.
let nextPlaceholder = 1
let nextError = 1

const discard = (key: string) => void deleteUpload(key).catch(() => {})

// Images dropped or pasted into a Markdown textarea: a placeholder goes in at
// the caret for each, the upload replaces it with `![](/media/<key>)` and a
// failure removes it. An upload whose placeholder was deleted meanwhile, or
// still in flight when the editor goes, is deleted from R2.
export function useMarkdownImages(
  value: string,
  onChange: (value: string) => void,
  textarea: RefObject<HTMLTextAreaElement | null>
) {
  const [errors, setErrors] = useState<ImageError[]>([])
  const [uploading, setUploading] = useState(0)
  const [paused, setPaused] = useState(false)

  // The text as last rendered or changed here: uploads end at any time.
  const text = useRef(value)
  const change = useRef(onChange)
  // Set with the text, put on the textarea once it renders that text.
  const pending = useRef<Selection>(undefined)
  const add = useRef<(files: File[]) => void>(() => {})

  useLayoutEffect(() => {
    text.current = value
    change.current = onChange
    const area = textarea.current
    if (pending.current && area?.value === value) {
      area.setSelectionRange(pending.current.start, pending.current.end)
      pending.current = undefined
    }
  })

  useEffect(() => {
    // Queue id → placeholder, and file → queue id.
    const marks = new Map<number, string>()
    const ids = new Map<File, number>()

    function selection(): Selection {
      const area = textarea.current
      const end = text.current.length
      return (
        pending.current ??
        (area
          ? { start: area.selectionStart, end: area.selectionEnd }
          : { start: end, end })
      )
    }

    function apply(edit: TextEdit) {
      text.current = edit.text
      pending.current = edit.selection
      change.current(edit.text)
    }

    // False when `from` is no longer in the text.
    function swap(from: string, to: string, caret?: number) {
      const edit = replaceIn(text.current, selection(), from, to, caret)
      if (edit) apply(edit)
      return edit !== null
    }

    function fail(name: string, message: string) {
      setErrors((current) => [...current, { id: nextError++, name, message }])
    }

    const queue = new UploadQueue<{ file: File; key: string }>({
      concurrency: UPLOAD_CONCURRENCY,
      upload: async (file, onProgress) => ({
        file,
        key: (await uploadFile(file, onProgress)).key,
      }),
      save: async ({ file, key }) => {
        const id = ids.get(file)!
        ids.delete(file)
        const from = marks.get(id)!
        marks.delete(id)
        if (!swap(from, imageMarkdown(mediaUrl(key)), ALT_OFFSET)) discard(key)
      },
      discard: ({ key }) => discard(key),
      isRateLimited: (error) =>
        error instanceof AdminApiError && error.status === 429,
      describe: (error) =>
        error instanceof AdminApiError ? errorMessage(error) : "Failed.",
      pauseMs: RATE_LIMIT_PAUSE_MS,
      onChange: (next) => {
        // A failed file is not retried here: its placeholder goes, its error
        // shows under the editor. Then the queue forgets both kinds.
        const failed = next.items.filter((item) => item.status === "failed")
        for (const item of failed) {
          const from = marks.get(item.id)
          marks.delete(item.id)
          if (from) swap(from, "")
          fail(item.name, item.error ?? "Failed.")
        }
        const done = next.items.some((item) => item.status === "done")
        if (failed.length > 0 || done) {
          // Each emits again, without them.
          for (const item of failed) queue.dismiss(item.id)
          if (done) queue.clearDone()
          return
        }
        setUploading(next.items.length)
        setPaused(next.paused)
      },
    })

    // Only images go into the text; the others are refused at once.
    add.current = (files) => {
      const images = files.filter((file) => file.type.startsWith("image/"))
      for (const file of files) {
        if (!images.includes(file)) fail(file.name, "Only images go here.")
      }
      if (images.length === 0) return
      const inserted = images.map(() => placeholder(nextPlaceholder++))
      apply(insertAt(text.current, selection(), inserted.join("\n\n")))
      textarea.current?.focus()
      queue.add(images).forEach((id, index) => {
        marks.set(id, inserted[index])
        ids.set(images[index], id)
      })
    }

    return () => {
      queue.dispose()
      for (const from of marks.values()) swap(from, "")
    }
  }, [textarea])

  return {
    add: (files: File[]) => add.current(files),
    uploading,
    paused,
    errors,
    dismiss: (id: number) =>
      setErrors((current) => current.filter((error) => error.id !== id)),
  }
}
