import * as React from "react"

import type { Direction } from "@contracts/lang"

// The provider lives in app/providers and derives the Direction from the Lang.
export const DirectionContext = React.createContext<Direction | undefined>(
  undefined
)

export type DirectionState = {
  dir: Direction
  // Mirrors a horizontal offset in RTL: Motion `x`, swipe deltas, drag bounds.
  // `flipX(40)` moves 40px toward the inline end in both directions.
  flipX: (x: number) => number
}

export const useDirection = (): DirectionState => {
  const dir = React.useContext(DirectionContext)

  if (dir === undefined) {
    throw new Error("useDirection must be used within a DirectionProvider")
  }

  return React.useMemo(
    () => ({ dir, flipX: (x) => (dir === "rtl" ? -x : x) }),
    [dir]
  )
}
