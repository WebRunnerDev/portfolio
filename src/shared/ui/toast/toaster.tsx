import { useEffect } from "react"
import { Gauge } from "lucide-react"
import { toast, Toaster as Sonner } from "sonner"

import { onNotify, takeQueued } from "./queue"

// The toaster's chunk, loaded by the first `notify`. Its effect runs after
// sonner's own, which subscribes to the toasts: what waited shows then.
// A raised surface with a border (DESIGN.md › Colors), square, without a
// shadow; sonner moves it with transform and opacity, and not at all under
// reduced motion. It reads `<html dir>`, so it mirrors in the ar Lang.
const icon = (
  <Gauge
    aria-hidden="true"
    strokeWidth={1.5}
    className="size-5 text-zsd-primary-text"
  />
)

export default function Toaster() {
  useEffect(() => {
    const show = () => {
      for (const message of takeQueued()) toast(message, { icon })
    }
    show()
    return onNotify(show)
  }, [])

  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        unstyled: true,
        duration: 8000,
        classNames: {
          toast:
            "flex w-(--width) items-start gap-zsd-sm border border-zsd-outline-muted bg-zsd-surface-raised p-zsd-md text-zsd-body-sm text-zsd-on-surface",
          icon: "mt-px shrink-0",
        },
      }}
    />
  )
}
