import type { ComponentProps } from "react"

import { BarButton } from "@/shared/ui/bar-button"

const LINE =
  "block h-[1.5px] w-full bg-current transition-transform duration-(--zsd-x-zsd-motion-duration-base) ease-zsd-enter motion-reduce:transition-none"

// Two hairlines, the lower one shorter and flush right; on hover
// and focus it runs out to full length. Not directional, so not mirrored.
function LinesIcon() {
  return (
    <span aria-hidden className="flex w-4 flex-col gap-[5px]">
      <span className={LINE} />
      <span
        className={`${LINE} origin-right scale-x-[0.55] group-hover/button:scale-x-100 group-focus-visible/button:scale-x-100`}
      />
    </span>
  )
}

// Two hairlines crossed, the same weight as the menu's.
export function CrossIcon() {
  return (
    <span aria-hidden className="relative block size-4">
      <span className={`${LINE} absolute top-1/2 -mt-px rotate-45`} />
      <span className={`${LINE} absolute top-1/2 -mt-px -rotate-45`} />
    </span>
  )
}

// The menu trigger, and the stand-in while the menu loads, so the header
// doesn't shift. Icon-only below `sm`; the close button of the menu bar takes
// the same place.
export function MenuButton({
  label,
  ...props
}: ComponentProps<typeof BarButton> & { label: string }) {
  return (
    <BarButton square aria-label={label} title={label} {...props}>
      <span className="max-sm:hidden">{label}</span>
      <LinesIcon />
    </BarButton>
  )
}
