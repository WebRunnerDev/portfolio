import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type DragEvent,
} from "react"
import { CircleAlert, X } from "lucide-react"
import { cn } from "cn"

import { Button, Textarea, ToggleGroup, ToggleGroupItem } from "@/shared/ui/kit"
import { Markdown } from "@/shared/ui/markdown"

import type { Direction, Lang } from "@contracts/lang"
import type { MarkdownTree } from "@contracts/markdown/tree"

import { useMarkdownImages } from "./use-markdown-images"

// The preview renders this long after the last keystroke, not on each one.
const PREVIEW_DELAY = 300

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// The preview's tree, built here as the Worker builds the public pages' (the
// parser and Shiki load with the first preview), or null until it is.
function usePreviewTree(text: string) {
  const [tree, setTree] = useState<MarkdownTree | null>(null)
  useEffect(() => {
    let current = true
    import("@contracts/markdown/parse")
      .then(({ markdownTree }) => markdownTree(text))
      .then((next) => {
        if (current) setTree(next)
      })
      // No preview rather than a broken editor.
      .catch(() => {})
    return () => {
      current = false
    }
  }, [text])
  return tree
}

// Markdown on the left, the preview on the right, rendered by the site's own
// `Markdown`. Below `lg` one at a time, picked by Text / Preview. Images
// dropped or pasted into the text upload to R2 and go in at the caret.
export function MarkdownInput({
  value,
  onChange,
  lang,
  dir,
  ...props
}: Omit<ComponentProps<"textarea">, "value" | "onChange"> & {
  value: string
  onChange: (value: string) => void
  lang?: Lang
  dir?: Direction
}) {
  const [shown, setShown] = useState<"text" | "preview">("text")
  const preview = useDebounced(value, PREVIEW_DELAY)
  const tree = usePreviewTree(preview)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const images = useMarkdownImages(value, onChange, textarea)
  const [over, setOver] = useState(false)

  // Files only; dragged text keeps the textarea's own behaviour.
  const hasFiles = (event: DragEvent) =>
    event.dataTransfer.types.includes("Files")

  return (
    <div className="flex flex-col gap-zsd-sm">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={shown}
        // Pressing the shown one again keeps it.
        onValueChange={(next) => next && setShown(next as typeof shown)}
        className="self-start lg:hidden"
      >
        <ToggleGroupItem value="text">Text</ToggleGroupItem>
        <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
      </ToggleGroup>
      <div className="grid gap-zsd-md lg:grid-cols-2">
        <Textarea
          {...props}
          ref={textarea}
          lang={lang}
          dir={dir}
          className={cn(
            "max-h-[40rem] min-h-80 font-mono",
            shown !== "text" && "hidden lg:flex",
            over && "border-primary bg-muted"
          )}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={(event) => {
            const files = [...event.clipboardData.files]
            if (files.length === 0) return
            event.preventDefault()
            images.add(files)
          }}
          onDragOver={(event) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            event.dataTransfer.dropEffect = "copy"
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            setOver(false)
            images.add([...event.dataTransfer.files])
          }}
        />
        <section
          aria-label="Preview"
          dir={dir}
          className={cn(
            "max-h-[40rem] min-h-80 min-w-0 overflow-auto rounded-lg border border-input p-zsd-md",
            shown !== "preview" && "hidden lg:block"
          )}
        >
          {preview.trim() ? (
            tree && <Markdown tree={tree} lang={lang} />
          ) : (
            <p className="text-zsd-body-sm text-muted-foreground">
              Nothing to preview yet.
            </p>
          )}
        </section>
      </div>
      <p
        aria-live="polite"
        className="text-zsd-body-sm text-muted-foreground empty:hidden"
      >
        {images.uploading > 0 &&
          `Uploading ${images.uploading} ${images.uploading === 1 ? "image" : "images"}…`}
        {images.paused &&
          " Too many uploads for now: going on in a minute by itself."}
      </p>
      {images.errors.length > 0 && (
        <ul role="alert" aria-label="Image errors" className="flex flex-col">
          {images.errors.map((error) => (
            <li
              key={error.id}
              className="flex items-center gap-zsd-sm text-zsd-body-sm text-zsd-error"
            >
              <CircleAlert aria-hidden className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                {error.name}: {error.message}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Dismiss ${error.name}`}
                onClick={() => images.dismiss(error.id)}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
