import type { ComponentProps } from "react"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/kit"

// A control of the header bar (the Lang menu, the mode, the menu and its
// close button): no border and no fill, only type and a drawn icon on the
// bar. Hover, focus and an open menu light the text and draw a rust hairline
// under it from the start edge. The full target height; `square` drops the
// label below `sm` to fit 320px, `icon` is square at every width.
export function BarButton({
  square = false,
  icon = false,
  className,
  ...props
}: ComponentProps<typeof Button> & { square?: boolean; icon?: boolean }) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "relative h-zsd-control-height gap-zsd-sm rounded-none border-0 bg-transparent px-zsd-sm font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase",
        "hover:bg-transparent hover:text-zsd-on-surface focus-visible:text-zsd-on-surface focus-visible:ring-0 active:bg-transparent aria-expanded:bg-transparent aria-expanded:text-zsd-on-surface dark:hover:bg-transparent",
        "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none",
        "after:absolute after:inset-x-zsd-sm after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-zsd-primary after:transition-transform after:duration-(--zsd-x-zsd-motion-duration-base) after:ease-zsd-enter motion-reduce:after:transition-none rtl:after:origin-right",
        "hover:after:scale-x-100 focus-visible:after:scale-x-100 aria-expanded:after:scale-x-100",
        square && "max-sm:w-zsd-control-height max-sm:px-0",
        icon && "w-zsd-control-height px-0",
        className
      )}
      {...props}
    />
  )
}
