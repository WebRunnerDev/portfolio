import type { ComponentProps } from "react"
import { Menu } from "lucide-react"

import { Button } from "@/shared/ui/kit"

// The menu trigger, and the Suspense fallback while the menu loads, so the
// header doesn't shift. Icon-only below `sm` to fit 360px.
export function MenuButton({
  label,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button variant="ghost" aria-label={label} title={label} {...props}>
      <Menu aria-hidden />
      <span className="max-sm:hidden">{label}</span>
    </Button>
  )
}
