// PROTOTYPE, branch spike/page-head only, never merged to main.
// docs/plan.md › Этап 7 › п. 10, `?head=`: the head of a page other than
// home. Wraps the page's title block (`children`) and puts under it:
//  - `lattice`: the brief's CSS lattice of rhombi, a few cells lit
//    (docs/design-brief.md › Арт-дирекция этапа 7 › База, 5), on every tier;
//  - `band`: the home page's real Swarm (HomeFull) laid over a band under
//    the title, its logo gathering at the band's end; the lattice until the
//    scene has drawn, and at `lite`/`static`;
//  - `swarm`: the same scene over the whole head, title and band, the web
//    stepping out of the title; its logo at the end of the band.
// The scene is the home page's own module, imported across FSD layers here
// only: production would move it to a shared layer.
import * as React from "react"
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react"

import { useLang } from "@/shared/i18n"
import { useMotionTier } from "@/shared/lib/motion-tier"
import { proto, prototypeShown } from "@/shared/lib/prototype"

export type FullProps = {
  lang: string
  onFail: () => void
  onShown: () => void
}
export type LoadScene = () => Promise<{ default: ComponentType<FullProps> }>

function FullFailed({ onFail }: FullProps) {
  useEffect(onFail, [onFail])
  return null
}

// The app layer hands the home page's scene in (FSD: shared can't import a
// page), once at start; without it the lattice only.
let loadScene: LoadScene | null = null
export function registerPageScene(load: LoadScene) {
  loadScene = load
}

// The scene's lazy component, made once: the provider's loader is set
// before any head renders it.
const Scene = lazy(() =>
  (loadScene ? loadScene() : Promise.reject(new Error("no scene"))).catch(
    () => ({ default: FullFailed })
  )
)

// The lit cells, counted from the band's end (physical right: the lattice,
// as the hero, is never mirrored): [column, row], row 0 or 1 of the two
// inner rows of cells.
const LIT: [number, number, number][] = [
  [1, 0, 0],
  [3, 1, 1.4],
  [6, 0, 2.6],
]

function Lattice({ fading }: { fading: boolean }) {
  return (
    <div
      aria-hidden="true"
      dir="ltr"
      data-fading={fading}
      className="page-lattice absolute inset-0 transition-opacity duration-(--zsd-x-zsd-motion-duration-slow) ease-zsd-exit data-[fading=true]:opacity-0"
    >
      {LIT.map(([col, row, delay]) => (
        <span
          key={col}
          className="page-lattice-lit"
          style={
            {
              "--col": col,
              "--row": row,
              "--delay": `${delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

const BLEED = "relative ms-[calc(50%-50dvw)] w-dvw"

export function PageHead({ children }: { children: React.ReactNode }) {
  const head = prototypeShown() ? proto("head") : "plain"
  const { tier, fallBack } = useMotionTier()
  const lang = useLang()
  const [shown, setShown] = useState(false)
  const wrapper = React.useRef<HTMLDivElement>(null)
  const web = React.useRef<HTMLDivElement>(null)

  // `swarm`: the web's box from the top of <main> to the band's end.
  React.useLayoutEffect(() => {
    if (head !== "swarm") return
    const place = () => {
      const main = document.getElementById("main")
      const box = wrapper.current
      const element = web.current
      if (!main || !box || !element) return
      const top =
        main.getBoundingClientRect().top - box.getBoundingClientRect().top
      element.style.top = `${top}px`
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [head])

  if (head === "plain") return <>{children}</>

  const live = head !== "lattice" && tier === "full" && loadScene !== null
  const anchor = live && (
    <div
      data-swarm-anchor="hero"
      className="absolute inset-e-[6%] top-1/2 aspect-square h-[78%] -translate-y-1/2"
    />
  )

  return (
    <div ref={wrapper} className="relative">
      {head === "swarm" && (
        <div
          ref={web}
          aria-hidden="true"
          data-swarm-web="hero"
          className="pointer-events-none absolute inset-s-[calc(50%-50dvw)] bottom-0 w-dvw"
        />
      )}
      <div data-swarm-text className="relative">
        {children}
      </div>
      <div
        {...(head === "band" ? { "data-swarm-web": "hero" } : {})}
        className={`${BLEED} mt-zsd-xl h-[calc(var(--lattice-cell)*3)] overflow-hidden [--lattice-cell:32px] md:[--lattice-cell:44px] ${head === "swarm" ? "md:h-[calc(var(--lattice-cell)*4)]" : ""}`}
      >
        <Lattice fading={live && shown} />
        {anchor}
      </div>
      {live && (
        <Suspense>
          <Scene lang={lang} onFail={fallBack} onShown={() => setShown(true)} />
        </Suspense>
      )}
    </div>
  )
}
