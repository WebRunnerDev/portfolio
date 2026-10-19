import { Link, getRouteApi } from "@tanstack/react-router"

import { useLang, useT } from "@/shared/i18n"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"
import { PageStub } from "@/shared/ui/page-stub"

const route = getRouteApi("/$lang/projects/")

// The projects as a plain list; the card grid lands with #69.
export function ProjectsPage() {
  const lang = useLang()
  const t = useT()
  const projects = route.useLoaderData()

  return (
    <PageStub title={t("nav.projects")}>
      <ul className="flex flex-col gap-zsd-lg">
        {projects.map((project) => (
          <li key={project.id} className="flex flex-col gap-zsd-xs">
            <FallbackNotice fallback={project.fallback} />
            <div lang={fallbackLang(project)}>
              <h2 className="font-heading text-zsd-headline-sm text-zsd-on-surface">
                {project.hasCaseStudy ? (
                  <Link
                    to="/$lang/projects/$slug"
                    params={{ lang, slug: project.slug }}
                    className="underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {project.title}
                  </Link>
                ) : (
                  project.title
                )}
              </h2>
              <p>{project.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </PageStub>
  )
}
