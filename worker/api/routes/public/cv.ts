import { sValidator } from "@hono/standard-validator"
import { Hono } from "hono"
import {
  CvSectionsQuerySchema,
  type Certification,
  type CvSection,
  type Education,
  type Experience,
  type LanguageSkill,
  type Technology,
} from "@contracts/api/public"
import { methodNotAllowed, rejectInvalid } from "../../errors"
import {
  parseJson,
  technologiesOf,
  translationOf,
  type PublicEnv,
} from "../../public"

// The CV Sections and what goes into them (CONTEXT.md › CV). Projects are in
// projects.ts.

// The column comes from code: one per form of the CV.
const SHOW_COLUMN = { web: "show_web", print: "show_pdf" } as const

export const cvSections = new Hono<PublicEnv>()
  .get(
    "/",
    sValidator("query", CvSectionsQuerySchema, rejectInvalid),
    async (c) => {
      const { form } = c.req.valid("query")
      const { results } = await c.env.DB.prepare(
        `SELECT type FROM cv_section WHERE ${SHOW_COLUMN[form]} = 1
        ORDER BY position, id`
      ).all<CvSection>()
      return c.json(results.map(({ type }) => ({ type })) satisfies CvSection[])
    }
  )
  .all("/", methodNotAllowed("GET, HEAD"))

type ExperienceRow = {
  id: number
  fallback: number
  company: string
  company_url: string | null
  role: string
  location: string | null
  start_month: string
  end_month: string | null
  bullets: string
  technologies: string
}

export const experience = new Hono<PublicEnv>()
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT e.id, t.lang <> ?1 AS fallback, t.company, e.company_url, t.role,
        t.location, e.start_month, e.end_month, t.bullets,
        ${technologiesOf("experience", "e")} AS technologies
      FROM experience e JOIN ${translationOf("experience", "e")}
      ORDER BY e.position, e.id`
    )
      .bind(c.var.lang)
      .all<ExperienceRow>()
    return c.json(
      results.map((row) => ({
        id: row.id,
        fallback: row.fallback === 1,
        company: row.company,
        companyUrl: row.company_url,
        role: row.role,
        location: row.location,
        startMonth: row.start_month,
        endMonth: row.end_month,
        bullets: parseJson<string[]>(row.bullets),
        technologies: parseJson<Technology[]>(row.technologies),
      })) satisfies Experience[]
    )
  })
  .all("/", methodNotAllowed("GET, HEAD"))

type EducationRow = {
  id: number
  fallback: number
  institution: string
  degree: string
  diploma: string | null
  gpa: string | null
  start_month: string
  end_month: string | null
}

export const education = new Hono<PublicEnv>()
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT e.id, t.lang <> ?1 AS fallback, t.institution, t.degree,
        t.diploma, e.gpa, e.start_month, e.end_month
      FROM education e JOIN ${translationOf("education", "e")}
      ORDER BY e.position, e.id`
    )
      .bind(c.var.lang)
      .all<EducationRow>()
    return c.json(
      results.map((row) => ({
        id: row.id,
        fallback: row.fallback === 1,
        institution: row.institution,
        degree: row.degree,
        diploma: row.diploma,
        gpa: row.gpa,
        startMonth: row.start_month,
        endMonth: row.end_month,
      })) satisfies Education[]
    )
  })
  .all("/", methodNotAllowed("GET, HEAD"))

type CertificationRow = {
  id: number
  name: string
  issuer: string
  issued_month: string | null
  credential_url: string | null
}

export const certifications = new Hono<PublicEnv>()
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT id, name, issuer, issued_month, credential_url
      FROM certification ORDER BY position, id`
    ).all<CertificationRow>()
    return c.json(
      results.map((row) => ({
        id: row.id,
        name: row.name,
        issuer: row.issuer,
        issuedMonth: row.issued_month,
        credentialUrl: row.credential_url,
      })) satisfies Certification[]
    )
  })
  .all("/", methodNotAllowed("GET, HEAD"))

type LanguageSkillRow = {
  id: number
  fallback: number
  code: string
  name: string
  level: string
}

export const languages = new Hono<PublicEnv>()
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT l.id, t.lang <> ?1 AS fallback, l.code, t.name, t.level
      FROM language_skill l JOIN ${translationOf("language_skill", "l")}
      ORDER BY l.position, l.id`
    )
      .bind(c.var.lang)
      .all<LanguageSkillRow>()
    return c.json(
      results.map((row) => ({
        id: row.id,
        fallback: row.fallback === 1,
        code: row.code,
        name: row.name,
        level: row.level,
      })) satisfies LanguageSkill[]
    )
  })
  .all("/", methodNotAllowed("GET, HEAD"))

// The whole directory, grouped by category, then in order.
export const technologies = new Hono<PublicEnv>()
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT id, name, category, icon FROM technology
      ORDER BY category, position, name`
    ).all<Technology>()
    return c.json(results satisfies Technology[])
  })
  .all("/", methodNotAllowed("GET, HEAD"))
