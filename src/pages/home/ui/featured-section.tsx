import { use } from "react"
import { cn } from "cn"

import type { Project } from "@contracts/api/public"
import { ProjectCard } from "@/entities/project"
import { useT } from "@/shared/i18n"
import { Reveal } from "@/shared/ui/reveal"

import { HomeSection } from "./home-section"

// The first card spans the grid; from `lg` its cover is 3/5 of it.
const WIDE_SIZES = "(min-width: 1024px) 650px, 100vw"
const SIZES = "(min-width: 1024px) 568px, (min-width: 640px) 50vw, 100vw"

// Featured Projects (docs/design-brief.md › Home rhythm): dense and large,
// one wide card and, from `sm`, two under it. Leads to the Projects page.
// Not shown without a Featured Project.
export function FeaturedSection({
  projects,
}: {
  projects: Promise<Project[]>
}) {
  const t = useT()
  const featured = use(projects)
  if (featured.length === 0) return null

  return (
    <HomeSection
      id="projects"
      title={t("home.featured.title")}
      link="/$lang/projects"
      linkText={t("home.featured.link")}
      className="pt-zsd-section lg:pt-zsd-section-lg"
    >
      <ul className="mt-zsd-xl grid gap-zsd-xl sm:grid-cols-2">
        {featured.map((project, i) => (
          <Reveal
            as="li"
            key={project.id}
            order={i}
            className={cn(i === 0 && "sm:col-span-2")}
          >
            <ProjectCard
              project={project}
              heading="h3"
              wide={i === 0}
              sizes={i === 0 ? WIDE_SIZES : SIZES}
            />
          </Reveal>
        ))}
      </ul>
    </HomeSection>
  )
}
