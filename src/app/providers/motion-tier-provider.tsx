import * as React from "react"

import {
  detectTier,
  hadFirstInteraction,
  MIN_FULL_FPS,
  MotionTierContext,
  onFirstInteraction,
  probeFps,
  REDUCED_MOTION,
  type MotionTier,
} from "@/shared/lib/motion-tier"

// `lite` until the probe lets a `full` candidate through, so nothing heavy
// starts on a device that can't hold it.
const initialTier = (): MotionTier =>
  detectTier() === "static" ? "static" : "lite"

// The Motion Tier of this device, one for the whole public part and the
// visit (ADR-0006, ADR-0012). Turning reduced motion on or off detects it
// again. `full` waits for the input gate as well as the FPS probe, so the
// full layer stays out of the load and of Lighthouse's measure; `fallBack`
// drops it to `lite` for the rest of the visit.
export function MotionTierProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [probed, setProbed] = React.useState(initialTier)
  const [input, setInput] = React.useState(hadFirstInteraction)
  const failed = React.useRef(false)

  React.useEffect(() => onFirstInteraction(() => setInput(true)), [])

  React.useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION)
    let probe: AbortController | undefined

    const update = () => {
      probe?.abort()
      const detected = detectTier()
      if (detected !== "full" || failed.current) {
        setProbed(detected === "full" ? "lite" : detected)
        return
      }
      setProbed("lite")
      probe = new AbortController()
      probeFps(undefined, probe.signal).then(
        (fps) => fps >= MIN_FULL_FPS && setProbed("full"),
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

  const fallBack = React.useCallback(() => {
    failed.current = true
    setProbed((tier) => (tier === "full" ? "lite" : tier))
  }, [])

  const tier = probed === "full" && !input ? "lite" : probed
  const value = React.useMemo(() => ({ tier, fallBack }), [tier, fallBack])

  return (
    <MotionTierContext.Provider value={value}>
      {children}
    </MotionTierContext.Provider>
  )
}
