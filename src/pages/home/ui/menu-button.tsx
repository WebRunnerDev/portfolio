import type { ComponentProps } from "react"
import { Menu } from "lucide-react"

import { Button } from "@/shared/ui/kit"

// The menu trigger, and the Suspense fallback while SiteMenu loads, so the
// header doesn't shift.
export function MenuButton({
  label,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button variant="ghost" {...props}>
      <Menu aria-hidden />
      {label}
    </Button>
  )
}
