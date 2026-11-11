import type { ReactNode } from "react"

import { cn } from "@/shared/lib/utils"

import { Logo } from "./logo"

// Logo, then the Brand name. The lockup is never mirrored (ADR-0007).
// `logo` replaces the logo, e.g. by a slot its tiles fly into (the menu).
// The name sits in a mask, so it can come out from under the logo
// (`nameClassName` moves it, e.g. `logo-flight-name` in the header).
export function BrandLockup({
  logo = <Logo className="size-6 shrink-0" />,
  className,
  nameClassName,
}: {
  logo?: ReactNode
  className?: string
  nameClassName?: string
}) {
  return (
    <span
      dir="ltr"
      data-testid="brand"
      className={cn("flex items-center gap-zsd-sm", className)}
    >
      {logo}
      <span className="-my-[0.15em] overflow-hidden py-[0.15em] font-heading text-zsd-headline-sm">
        <span className={cn("inline-block", nameClassName)}>WebRunner</span>
      </span>
    </span>
  )
}
