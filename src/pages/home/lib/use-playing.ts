import * as React from "react"

// Whether the effect should run: the element is in the viewport and the tab
// is shown. Without IntersectionObserver it counts as in view.
export function usePlaying<T extends Element>() {
  const ref = React.useRef<T>(null)
  const [inView, setInView] = React.useState(true)
  const [shown, setShown] = React.useState(true)

  React.useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting)
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    const update = () => setShown(document.visibilityState === "visible")
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])

  return { ref, playing: inView && shown }
}
