import { useCallback, useRef, useState } from "react"

export type IntentImport<T> = {
  // The module, once loaded. `open`: the click that asked for it.
  loaded: { module: T; open: boolean } | null
  // For the stand-in trigger: hover or a touch starts the load, a click
  // (Enter, Space) loads and asks to open.
  triggerProps: {
    onPointerEnter: () => void
    onPointerDown: () => void
    onClick: () => void
  }
}

// A part that isn't on the first paint (the menu, the player's panel) and
// loads only when the visitor reaches for its trigger, so its code stays out
// of the page load. Until then a stand-in trigger takes its place; the real
// one replaces it once loaded and opens if the stand-in was clicked. A failed
// load leaves the stand-in, and the next reach tries again.
export function useIntentImport<T>(load: () => Promise<T>): IntentImport<T> {
  const [loaded, setLoaded] = useState<IntentImport<T>["loaded"]>(null)
  const pending = useRef<Promise<T> | null>(null)

  const start = useCallback(
    (open: boolean) => {
      pending.current ??= load()
      pending.current.then(
        (module) =>
          setLoaded((current) => ({
            module,
            open: open || !!current?.open,
          })),
        () => {
          pending.current = null
        }
      )
    },
    [load]
  )

  return {
    loaded,
    triggerProps: {
      onPointerEnter: () => start(false),
      onPointerDown: () => start(false),
      onClick: () => start(true),
    },
  }
}
