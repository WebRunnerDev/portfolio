import { Suspense } from "react"
import { getRouteApi } from "@tanstack/react-router"

import { useHeroTier } from "../model/use-hero-tier"
import { CvSection } from "./cv-section"
import { GallerySection } from "./gallery-section"
import { Hero } from "./hero"
import { PostsSection } from "./posts-section"
import { ProjectsSection } from "./projects-section"

const route = getRouteApi("/$lang/")

// The hero, then the sections in the rhythm of docs/design-brief.md › Ритм
// главной: the CV, the Projects, the Gallery and the Blog. Each section waits
// for its own data below the fold, so none holds up the hero or another; one
// with nothing to show isn't rendered. The counter numbers the sections
// shown, after the hero's 01.
export function HomePage() {
  const { profile, cv, projects, posts, albums } = route.useLoaderData()
  const { tier, fallBack } = useHeroTier()

  return (
    <>
      <Hero tier={tier} profile={profile} onFullFail={fallBack} />
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
