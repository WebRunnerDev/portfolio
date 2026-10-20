import { useEffect } from "react"

// Browser Rendering (ADR-0003) waits for `html[data-print-ready]` before
// `page.pdf()`: the loader's data is rendered and the fonts are in.
export const PRINT_READY_ATTRIBUTE = "data-print-ready"

export function usePrintReady() {
  useEffect(() => {
    const root = document.documentElement
    let cancelled = false
    // After a frame the text is laid out, so its fonts have started loading
    // and `fonts.ready` waits for them.
    const frame = requestAnimationFrame(() => {
      void document.fonts.ready.then(() => {
        if (!cancelled) root.setAttribute(PRINT_READY_ATTRIBUTE, "")
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      root.removeAttribute(PRINT_READY_ATTRIBUTE)
    }
  }, [])
}
