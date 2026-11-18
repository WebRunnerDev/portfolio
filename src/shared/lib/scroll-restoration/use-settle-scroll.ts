import { useEffect } from "react"
import {
  useElementScrollRestoration,
  useRouterState,
} from "@tanstack/react-router"

import { settleScroll, type SettleEnv } from "./settle-scroll"

// The page is the document: its size is the root element's.
const windowEnv = (): SettleEnv => ({
  input: window,
  scrollTo: ({ top, left }) =>
    window.scrollTo({ top, left, behavior: "instant" }),
  observeSize: (onGrow) => {
    const observer = new ResizeObserver(onGrow)
    observer.observe(document.documentElement)
    return () => observer.disconnect()
  },
})

// `settleScroll` for each page rendered with a saved window scroll: a Back
// or Forward (`scrollRestoration` in src/main.tsx), or a reload. A new
// entry in the history has none, so a link still opens a page at its top.
export function useSettleScroll() {
  // The page rendered; it changes only once the new page is on screen.
  const key = useRouterState({
    select: (state) => state.resolvedLocation?.state.__TSR_key,
  })
  const saved = useElementScrollRestoration({ getElement: () => window })
  const top = saved?.scrollY
  const left = saved?.scrollX ?? 0

  useEffect(() => {
    if (key === undefined || top === undefined) return undefined
    return settleScroll({ top, left }, windowEnv())
  }, [key, top, left])
}
