import { notFound } from "@tanstack/react-router"

import type { Lang } from "@contracts/lang"
import { getProject, isNotFound } from "@/shared/api"

// A project has a page only with a Case Study; otherwise, like an unknown
// slug, it's a 404.
export async function loadProject(
  lang: Lang,
  slug: string,
  signal: AbortSignal
) {
  const project = await getProject(lang, slug, { signal }).catch(
    (error: unknown) => {
      if (isNotFound(error)) throw notFound()
      throw error
    }
  )
  if (!project.hasCaseStudy) throw notFound()
  return project
}
