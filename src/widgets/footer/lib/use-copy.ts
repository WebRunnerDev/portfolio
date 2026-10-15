import { useEffect, useRef, useState } from "react"

export type CopyState = "idle" | "copied" | "failed"

const RESET_MS = 2000

// Copies text and reports the result for a while, then goes back to idle.
export function useCopy() {
  const [state, setState] = useState<CopyState>("idle")
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async (text: string) => {
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(text)
      setState("copied")
    } catch {
      setState("failed")
    }
    timer.current = setTimeout(() => setState("idle"), RESET_MS)
  }

  return { state, copy }
}
