import type { ReactNode } from "react"

import { cn } from "@/shared/lib/utils"

import { Logo } from "./logo"

// Logo, then the Brand name. The lockup is never mirrored (ADR-0007).
// `logo` replaces the logo, e.g. by a slot its tiles fly into (the menu).
export function BrandLockup({
  logo = <Logo className="size-6 shrink-0" />,
  className,
}: {
  logo?: ReactNode
  className?: string
}) {
  return (
    <span
      dir="ltr"
      data-testid="brand"
      className={cn("flex items-center gap-zsd-sm", className)}
    >
      {logo}
      <span className="font-heading text-zsd-headline-sm">WebRunner</span>
    </span>
  )
}
