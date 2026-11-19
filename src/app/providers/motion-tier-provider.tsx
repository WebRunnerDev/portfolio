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
// drops it to `lite` for the rest of the visit. `diagnosis` says why, for
// `?motion` on the home page.
export function MotionTierProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [probed, setProbed] = React.useState(initialTier)
  const [input, setInput] = React.useState(hadFirstInteraction)
  const failed = React.useRef(false)
  // For the diagnosis only: the probe's rate and why `full` fell back.
  const [fps, setFps] = React.useState<number | null>(null)
  const [reason, setReason] = React.useState<string | null>(null)

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
        (fps) => {
          setFps(Math.round(fps))
          if (fps >= MIN_FULL_FPS) setProbed("full")
        },
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

  const fallBack = React.useCallback((why: string) => {
    failed.current = true
    setReason(why)
    setProbed((tier) => (tier === "full" ? "lite" : tier))
  }, [])

  const tier = probed === "full" && !input ? "lite" : probed
  const diagnosis = [
    tier,
    probed === "static"
      ? "reduced motion"
      : fps === null
        ? "probe running"
        : `probe ${fps} fps (${MIN_FULL_FPS} needed)`,
    input ? "input" : "no input yet",
    reason && `fell back: ${reason}`,
  ]
    .filter(Boolean)
    .join(" · ")
  const value = React.useMemo(
    () => ({ tier, fallBack, diagnosis }),
    [tier, fallBack, diagnosis]
  )

  return (
    <MotionTierContext.Provider value={value}>
      {children}
    </MotionTierContext.Provider>
  )
}
