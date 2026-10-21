import { useEffect, useState, type ComponentProps } from "react"
import { cn } from "cn"

import { Textarea, ToggleGroup, ToggleGroupItem } from "@/shared/ui/kit"
import { Markdown } from "@/shared/ui/markdown"

import type { Direction, Lang } from "@contracts/lang"

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

// Markdown on the left, the preview on the right, rendered by the site's own
// `Markdown`. Below `lg` one at a time, picked by Text / Preview.
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
          lang={lang}
          dir={dir}
          className={cn(
            "max-h-[40rem] min-h-80 font-mono",
            shown !== "text" && "hidden lg:flex"
          )}
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
            <Markdown lang={lang}>{preview}</Markdown>
          ) : (
            <p className="text-zsd-body-sm text-muted-foreground">
              Nothing to preview yet.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
