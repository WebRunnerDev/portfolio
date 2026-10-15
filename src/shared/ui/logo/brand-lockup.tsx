import { cn } from "@/shared/lib/utils"

import { Logo } from "./logo"

// Logo, then the Brand name. The lockup is never mirrored (ADR-0007).
export function BrandLockup({ className }: { className?: string }) {
  return (
    <span
      dir="ltr"
      data-testid="brand"
      className={cn("flex items-center gap-zsd-sm", className)}
    >
      <Logo className="size-6 shrink-0" />
      <span className="font-heading text-zsd-headline-sm">WebRunner</span>
    </span>
  )
}
