import * as React from "react"
import { Direction as RadixDirection } from "radix-ui"

import { langDirection } from "@contracts/lang"
import { useLang } from "@/shared/i18n"
import { DirectionContext } from "@/shared/lib/direction"

// One Direction from the Lang drives `<html dir>`, Radix and useDirection.
// Portalled content (menus, popovers, dialogs) sits under <body>, so it
// inherits `<html dir>`; Radix menus also stamp `dir` on their content.
export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const dir = langDirection(useLang())

  React.useLayoutEffect(() => {
    document.documentElement.dir = dir
  }, [dir])

  return (
    <DirectionContext.Provider value={dir}>
      <RadixDirection.Provider dir={dir}>{children}</RadixDirection.Provider>
    </DirectionContext.Provider>
  )
}
