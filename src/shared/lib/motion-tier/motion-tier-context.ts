import * as React from "react"

import type { MotionTier } from "./tier"

export type MotionTierState = {
  // `full` only once the FPS probe passed and the input gate opened; `lite`
  // before.
  tier: MotionTier
  // `full` doesn't hold on this device after all (the frame rate fell while
  // it ran, the context was lost, its chunk failed): `lite` for the rest of
  // the visit, on every page.
  fallBack: () => void
}

// The provider lives in app/providers; pages read the tier through
// useMotionTier.
export const MotionTierContext = React.createContext<
  MotionTierState | undefined
>(undefined)

export const useMotionTier = () => {
  const context = React.useContext(MotionTierContext)

  if (context === undefined) {
    throw new Error("useMotionTier must be used within a MotionTierProvider")
  }

  return context
}
