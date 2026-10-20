import { Hono } from "hono"
import type { Project, ProjectDetail, Technology } from "@contracts/api/public"
import type { Lang } from "@contracts/lang"
import { apiError, methodNotAllowed } from "../../errors"
import {
  parseJson,
  technologiesOf,
  translationOf,
  type PublicEnv,
} from "../../public"

type ProjectRow = {
  id: number
  fallback: number
  slug: string
  title: string
  description: string
  status: Project["status"]
  cover_key: string | null
  github_url: string | null
  demo_url: string | null
  featured: number
  in_cv: number
  cv_bullets: string
  case_study: string | null
  technologies: string
}

const SELECT_PROJECT = `SELECT p.id, t.lang <> ?1 AS fallback, p.slug, t.title,
    t.description, p.status, p.cover_key, p.github_url, p.demo_url, p.featured,
    p.in_cv, t.cv_bullets, t.case_study,
    ${technologiesOf("project", "p")} AS technologies
  FROM project p JOIN ${translationOf("project", "p")}`

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    fallback: row.fallback === 1,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    coverKey: row.cover_key,
    githubUrl: row.github_url,
    demoUrl: row.demo_url,
    featured: row.featured === 1,
    inCv: row.in_cv === 1,
    cvBullets: parseJson<string[]>(row.cv_bullets),
    hasCaseStudy: row.case_study !== null,
    technologies: parseJson<Technology[]>(row.technologies),
  }
}

// The Project at `slug` on a Lang, with its Case Study; null for an unknown
// slug. Meta Injection of its page reads it too.
export async function readProject(
  db: D1Database,
  lang: Lang,
  slug: string
): Promise<ProjectDetail | null> {
  const row = await db
    .prepare(`${SELECT_PROJECT} WHERE p.slug = ?2`)
    .bind(lang, slug)
    .first<ProjectRow>()
  if (!row) return null
  return { ...toProject(row), caseStudy: row.case_study }
}

// The list leaves out the case study; the client filters `featured` / `inCv`.
export const projects = new Hono<PublicEnv>()
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `${SELECT_PROJECT} ORDER BY p.position, p.id`
    )
      .bind(c.var.lang)
      .all<ProjectRow>()
    return c.json(results.map(toProject) satisfies Project[])
  })
  .get("/:slug", async (c) => {
    const found = await readProject(c.env.DB, c.var.lang, c.req.param("slug"))
    if (!found) return apiError(c, 404, "not_found")
    return c.json(found satisfies ProjectDetail)
  })
  .all("/", methodNotAllowed("GET, HEAD"))
  .all("/:slug", methodNotAllowed("GET, HEAD"))
