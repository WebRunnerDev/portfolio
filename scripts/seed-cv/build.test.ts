// Runs in workerd (the `worker` project in vite.config.ts): seeds the clean
// local D1 from docs/private/seed.example.json and reads the CV back through
// the Public API, the way scripts/seed-cv.mjs fills a real database.
import { env, exports } from "cloudflare:workers"
import * as v from "valibot"
import { beforeAll, describe, expect, it } from "vitest"
import {
  CertificationSchema,
  CvSectionSchema,
  EducationSchema,
  ExperienceSchema,
  LanguageSkillSchema,
  ProfileSchema,
  ProjectSchema,
  TechnologySchema,
} from "@contracts/api/public"
import example from "../../docs/private/seed.example.json"
import { buildSeedSql, sqlValue } from "./build"

async function seed(input: unknown = example) {
  await env.DB.batch(buildSeedSql(input).map((sql) => env.DB.prepare(sql)))
}

async function get<T extends v.GenericSchema>(path: string, schema: T) {
  const response = await exports.default.fetch(
    `https://webrunner.dev/api/public${path}`
  )
  expect(response.status).toBe(200)
  return v.parse(schema, await response.json())
}

const CV_TABLES = [
  "profile",
  "profile_translation",
  "cv_section",
  "technology",
  "experience",
  "experience_translation",
  "experience_technology",
  "education",
  "education_translation",
  "certification",
  "language_skill",
  "language_skill_translation",
  "project",
  "project_translation",
  "project_technology",
]

async function dump() {
  const tables: Record<string, unknown[]> = {}
  for (const table of CV_TABLES) {
    const { results } = await env.DB.prepare(
      `SELECT * FROM ${table} ORDER BY 1, 2`
    ).all()
    tables[table] = results
  }
  return tables
}

beforeAll(() => seed())

describe("seed-cv", () => {
  it.each(["en", "ru"] as const)("gives the full CV in %s", async (lang) => {
    const translated = example.profile.translations[lang]
    expect(await get(`/${lang}/profile`, ProfileSchema)).toMatchObject({
      fallback: false,
      name: translated.name,
      email: example.profile.email,
      githubUrl: example.profile.githubUrl,
    })

    const sections = await get(`/${lang}/cv-sections`, v.array(CvSectionSchema))
    expect(sections.map((s) => s.type)).toEqual(
      example.cvSections.filter((s) => s.showWeb).map((s) => s.type)
    )

    const technologies = await get(
      `/${lang}/technologies`,
      v.array(TechnologySchema)
    )
    expect(technologies.map((t) => t.name).sort()).toEqual(
      example.technologies.map((t) => t.name).sort()
    )

    const experience = await get(
      `/${lang}/experience`,
      v.array(ExperienceSchema)
    )
    expect(
      experience.map((e) => [e.fallback, e.role, e.bullets, e.technologies])
    ).toEqual(
      example.experience.map((e) => [
        false,
        e.translations[lang].role,
        e.translations[lang].bullets,
        e.technologies.map((name) => expect.objectContaining({ name })),
      ])
    )

    const education = await get(`/${lang}/education`, v.array(EducationSchema))
    expect(education.map((e) => [e.fallback, e.degree, e.gpa])).toEqual(
      example.education.map((e) => [false, e.translations[lang].degree, e.gpa])
    )

    const certifications = await get(
      `/${lang}/certifications`,
      v.array(CertificationSchema)
    )
    expect(certifications.map((c) => c.name)).toEqual(
      example.certifications.map((c) => c.name)
    )

    const languages = await get(
      `/${lang}/languages`,
      v.array(LanguageSkillSchema)
    )
    expect(languages.map((l) => [l.fallback, l.name, l.level])).toEqual(
      example.languages.map((l) => [
        false,
        l.translations[lang].name,
        l.translations[lang].level,
      ])
    )

    const projects = await get(`/${lang}/projects`, v.array(ProjectSchema))
    expect(
      projects.map((p) => [p.slug, p.fallback, p.inCv, p.cvBullets])
    ).toEqual(
      example.projects.map((p) => [
        p.slug,
        false,
        p.inCv,
        p.translations[lang].cvBullets,
      ])
    )
    expect(projects[0].technologies.map((t) => t.name)).toEqual(
      example.projects[0].technologies
    )
  })

  it("changes nothing when run again", async () => {
    const before = await dump()
    await seed()
    expect(await dump()).toEqual(before)
  })

  it("keeps rows the seed doesn't own and the Translations it lacks", async () => {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO project (slug) VALUES ('admin-only')"),
      env.DB.prepare(
        "INSERT INTO project_translation (project_id, lang, title, description, case_study) SELECT id, 'kk', 'Kk', 'Kk', '# Case' FROM project WHERE slug = 'sample-tracker'"
      ),
    ])
    await seed()
    const kept = await env.DB.prepare(
      "SELECT (SELECT count(*) FROM project WHERE slug = 'admin-only') AS project, (SELECT case_study FROM project_translation WHERE lang = 'kk') AS caseStudy"
    ).first()
    expect(kept).toEqual({ project: 1, caseStudy: "# Case" })
  })

  it("rejects a phone, an unknown Technology and a missing CV Section", () => {
    const withPhone = {
      ...example,
      profile: { ...example.profile, phone: "+1 555 0100" },
    }
    expect(() => buildSeedSql(withPhone)).toThrow()

    const unknownTechnology = {
      ...example,
      experience: [{ ...example.experience[0], technologies: ["Nope"] }],
    }
    expect(() => buildSeedSql(unknownTechnology)).toThrow(/Technology/)

    const fiveSections = { ...example, cvSections: example.cvSections.slice(1) }
    expect(() => buildSeedSql(fiveSections)).toThrow(/CV Section/)
  })

  it("quotes values as SQL literals", () => {
    expect(sqlValue("it's; fine")).toBe("'it''s; fine'")
    expect(sqlValue(["a'b"])).toBe(`'["a''b"]'`)
    expect(sqlValue(null)).toBe("NULL")
    expect(sqlValue(true)).toBe("1")
  })
})
