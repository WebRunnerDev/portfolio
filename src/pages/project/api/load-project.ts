import { notFound } from "@tanstack/react-router"

import type { Lang } from "@contracts/lang"
import { projectMeta } from "@contracts/meta"
import { getProject, isNotFound } from "@/shared/api"

// A project has a page only with a Case Study; otherwise, like an unknown
// slug, it's a 404. The meta, the same the Worker injects, goes to LangHead.
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
  const { caseStudy } = project
  if (caseStudy === null) throw notFound()
  return { meta: projectMeta(project), project, caseStudy }
}
