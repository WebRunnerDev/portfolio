import { lazy, Suspense, useEffect, useState, type ComponentType } from "react"
import { getRouteApi } from "@tanstack/react-router"

import { useLang } from "@/shared/i18n"
import { useMotionTier } from "@/shared/lib/motion-tier"

import { CvSection } from "./cv-section"
import { GallerySection } from "./gallery-section"
import { Hero } from "./hero"
import { HomePerson } from "./home-person"
import { PostsSection } from "./posts-section"
import { ProjectsSection } from "./projects-section"

const route = getRouteApi("/$lang/")

type HomeFullProps = {
  lang: string
  onFail: (reason: string) => void
  onShown: () => void
}

// What a full chunk that didn't load renders: nothing, and `full` fails.
function FullFailed({ onFail }: HomeFullProps) {
  useEffect(() => onFail("full chunk didn't load"), [onFail])
  return null
}

// Lazy: the full layer, the Swarm, stays out of the initial JS and the
// modulepreloads; it is imported only once the tier is `full`, which waits
// for the input gate (ADR-0012, ADR-0013). A chunk that doesn't load fails
// `full`: `lite` for the rest of the visit.
const HomeFull = lazy<ComponentType<HomeFullProps>>(() =>
  import("./home-full").then(
    (m) => ({ default: m.HomeFull }),
    () => ({ default: FullFailed })
  )
)

// The hero, then the sections in the rhythm of docs/design-brief.md › Ритм
// главной: the CV, the Projects, the Gallery and the Blog. Each section waits
// for its own data below the fold, so none holds up the hero or another; one
// with nothing to show isn't rendered. The counter numbers the sections
// shown, after the hero's 01. At `full` the Swarm runs behind the whole
// page; the hero's `lite` gives way once the scene has drawn.
export function HomePage() {
  const { profile, cv, projects, posts, albums } = route.useLoaderData()
  const { tier, fallBack } = useMotionTier()
  const lang = useLang()
  const [shown, setShown] = useState(false)

  return (
    <>
      <Hero tier={tier} profile={profile} covered={tier === "full" && shown} />
      <Suspense>
        <HomePerson profile={profile} />
      </Suspense>
      {tier === "full" && (
        <Suspense>
          <HomeFull
            lang={lang}
            onFail={fallBack}
            onShown={() => setShown(true)}
          />
        </Suspense>
      )}
      <div className="pb-zsd-section [counter-reset:home-section_1] empty:hidden lg:pb-zsd-section-lg">
        <Suspense>
          <CvSection cv={cv} />
        </Suspense>
        <Suspense>
          <ProjectsSection projects={projects} />
        </Suspense>
        <Suspense>
          <GallerySection albums={albums} />
        </Suspense>
        <Suspense>
          <PostsSection posts={posts} />
        </Suspense>
      </div>
    </>
  )
}
