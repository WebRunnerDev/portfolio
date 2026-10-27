import * as React from "react"

import {
  detectTier,
  MIN_FULL_FPS,
  probeFps,
  REDUCED_MOTION,
  type HeroTier,
} from "./tier"

// `lite` until the probe lets a `full` candidate through, so nothing heavy
// starts on a device that can't hold it.
const initialTier = (): HeroTier =>
  detectTier() === "static" ? "static" : "lite"

// The Hero Tier of this device (ADR-0006). Turning reduced motion on or off
// detects it again.
export function useHeroTier() {
  const [tier, setTier] = React.useState(initialTier)

  React.useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION)
    let probe: AbortController | undefined

    const update = () => {
      probe?.abort()
      const detected = detectTier()
      if (detected !== "full") {
        setTier(detected)
        return
      }
      setTier("lite")
      probe = new AbortController()
      probeFps(undefined, probe.signal).then(
        (fps) => fps >= MIN_FULL_FPS && setTier("full"),
        () => {}
      )
    }

    update()
    query.addEventListener("change", update)
    return () => {
      probe?.abort()
      query.removeEventListener("change", update)
    }
  }, [])

  return tier
}
