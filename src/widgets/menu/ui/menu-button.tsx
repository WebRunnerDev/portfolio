import type { ComponentProps } from "react"

import { Button } from "@/shared/ui/kit"

// `button-secondary` at the full target height; icon-only below `sm`, square,
// to fit 320px. The close button of the menu bar takes the same place.
export const BAR_BUTTON =
  "h-zsd-control-height gap-zsd-sm border-input px-zsd-md font-zsd-label-md text-zsd-label-md max-sm:w-zsd-control-height max-sm:px-0"

// Three tiles rising along a diagonal, as in the logo. Not directional, so
// not mirrored.
function TilesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M5 11.5L8.5 15L5 18.5L1.5 15Z" />
      <path d="M10 6.5L13.5 10L10 13.5L6.5 10Z" />
      <path d="M15 1.5L18.5 5L15 8.5L11.5 5Z" />
    </svg>
  )
}

// The menu trigger, and the Suspense fallback while the menu loads, so the
// header doesn't shift.
export function MenuButton({
  label,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      variant="outline"
      aria-label={label}
      title={label}
      className={BAR_BUTTON}
      {...props}
    >
      <TilesIcon />
      <span className="max-sm:hidden">{label}</span>
    </Button>
  )
}
