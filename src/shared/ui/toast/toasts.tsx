import { lazy, Suspense, useSyncExternalStore } from "react"

import { onNotify, wasNotified } from "./queue"

// Lazy: sonner stays out of the initial JS until the first `notify`.
const Toaster = lazy(() => import("./toaster"))

// Where `notify`'s toasts appear; mount it once, at the root. Renders
// nothing until the first `notify`.
export function Toasts() {
  const on = useSyncExternalStore(onNotify, wasNotified, () => false)
  if (!on) return null

  return (
    <Suspense>
      <Toaster />
    </Suspense>
  )
}
