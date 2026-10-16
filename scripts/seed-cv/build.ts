// Turns docs/private/seed.json into the SQL that fills D1 with the CV
// (scripts/seed-cv.mjs, migrations/README.md › Seeding the CV). Pure: no Node
// or Worker APIs, so the script runs it in Node and the test in workerd.
import * as v from "valibot"
import {
  CertificationAdmin,
  CvSectionAdmin,
  EducationAdmin,
  ExperienceAdmin,
  LanguageSkillAdmin,
  ProfileAdmin,
  ProjectAdmin,
  TechnologyAdmin,
} from "../../contracts/api/admin.ts"
import { LANGS, type Lang } from "../../contracts/lang.ts"

// The seed reuses the Admin API schemas (contracts/api/admin.ts), with these
// changes: links name Technologies (`technologies: ["React"]`) instead of
// `technologyIds`, and R2 keys (`photoKey`, `coverKey`) and the case study
// stay out: those are filled in the Admin. Lists are in display order.

// Translations in any Langs, EN required (CONTEXT.md › Fallback).
function translations<T extends v.GenericSchema>(translation: T) {
  return v.strictObject({
    ...(Object.fromEntries(
      LANGS.map((lang) => [lang, v.optional(translation)])
    ) as { [L in Lang]: v.OptionalSchema<T, undefined> }),
    en: translation,
  })
}

const TechnologyNames = v.optional(
  v.pipe(
    v.array(TechnologyAdmin.create.entries.name),
    v.check(unique, "Technologies must be unique")
  ),
  []
)

function unique<T>(items: T[]) {
  return new Set(items).size === items.length
}

const SeedSchema = v.pipe(
  v.strictObject({
    profile: v.omit(ProfileAdmin.create, ["photoKey"]),
    cvSections: v.pipe(
      v.array(CvSectionAdmin.create),
      v.check(
        (sections) =>
          unique(sections.map((s) => s.type)) &&
          sections.length === CvSectionAdmin.create.entries.type.options.length,
        "Every CV Section type exactly once"
      )
    ),
    technologies: v.pipe(
      v.array(TechnologyAdmin.create),
      v.check(
        (list) => unique(list.map((t) => t.name)),
        "Technology names must be unique"
      )
    ),
    experience: v.array(
      v.strictObject({
        ...v.omit(ExperienceAdmin.create, ["technologyIds"]).entries,
        technologies: TechnologyNames,
      })
    ),
    education: v.array(EducationAdmin.create),
    certifications: v.array(CertificationAdmin.create),
    languages: v.pipe(
      v.array(LanguageSkillAdmin.create),
      v.check(
        (list) => unique(list.map((l) => l.code)),
        "Language codes must be unique"
      )
    ),
    projects: v.pipe(
      v.array(
        v.strictObject({
          ...v.omit(ProjectAdmin.create, [
            "coverKey",
            "technologyIds",
            "translations",
          ]).entries,
          technologies: TechnologyNames,
          translations: translations(
            v.omit(ProjectAdmin.translation, ["caseStudy"])
          ),
        })
      ),
      v.check(
        (list) => unique(list.map((p) => p.slug)),
        "Project slugs must be unique"
      )
    ),
  }),
  v.check((seed) => {
    const names = new Set(seed.technologies.map((t) => t.name))
    return [...seed.experience, ...seed.projects].every((row) =>
      row.technologies.every((name) => names.has(name))
    )
  }, "Every linked Technology must be in `technologies`")
)

export type SeedInput = v.InferInput<typeof SeedSchema>

// `{ sql }` is an expression put in as is, such as a subquery for an id.
type Value = string | number | boolean | null | string[] | { sql: string }

// SQL literal: `wrangler d1 execute --file` takes no bound parameters.
export function sqlValue(value: Value): string {
  if (value === null) return "NULL"
  if (typeof value === "object" && !Array.isArray(value)) return value.sql
  if (typeof value === "boolean") return value ? "1" : "0"
  if (typeof value === "number") return String(value)
  const text = Array.isArray(value) ? JSON.stringify(value) : value
  return `'${text.replaceAll("'", "''")}'`
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

// INSERT that updates the row with the same `key` instead. The update runs
// only when a value differs, so a second run leaves `updated_at` alone.
function upsert(
  table: string,
  values: Record<string, Value>,
  key: string[],
  { touch = false } = {}
): string {
  const columns = Object.keys(values)
  const updated = columns.filter((c) => !key.includes(c))
  const sets = updated.map((c) => `${c} = excluded.${c}`)
  if (touch) sets.push(`updated_at = ${NOW}`)
  return `${insert(table, values)} ON CONFLICT (${key.join(", ")}) DO UPDATE SET ${sets.join(
    ", "
  )} WHERE (${updated.join(", ")}) IS NOT (${updated
    .map((c) => `excluded.${c}`)
    .join(", ")})`
}

function insert(table: string, values: Record<string, Value>): string {
  const columns = Object.keys(values)
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns
    .map((c) => sqlValue(values[c]))
    .join(", ")})`
}

function translationRows<T>(translations: Partial<Record<Lang, T>>) {
  return LANGS.flatMap((lang) => {
    const translation = translations[lang]
    return translation ? [[lang, translation] as const] : []
  })
}

function idBy(table: string, column: string, value: string) {
  return {
    sql: `(SELECT id FROM ${table} WHERE ${column} = ${sqlValue(value)})`,
  }
}

// Checks `input` and returns the statements, in order. Running them again
// changes nothing: rows with a natural key are upserted, Experience,
// Education and Certification (no natural key) are replaced as a whole.
export function buildSeedSql(input: unknown): string[] {
  const seed = v.parse(SeedSchema, input)
  const sql: string[] = []

  const { translations: profileTranslations, ...profile } = seed.profile
  sql.push(
    upsert(
      "profile",
      {
        id: 1,
        email: profile.email,
        telegram_url: profile.telegramUrl,
        linkedin_url: profile.linkedinUrl,
        github_url: profile.githubUrl,
      },
      ["id"],
      { touch: true }
    )
  )
  for (const [lang, t] of translationRows(profileTranslations)) {
    sql.push(
      upsert(
        "profile_translation",
        {
          profile_id: 1,
          lang,
          name: t.name,
          headline: t.headline,
          about: t.about,
          location: t.location,
        },
        ["profile_id", "lang"]
      )
    )
  }

  seed.cvSections.forEach((section, position) => {
    sql.push(
      upsert(
        "cv_section",
        {
          type: section.type,
          position,
          show_web: section.showWeb,
          show_pdf: section.showPdf,
        },
        ["type"]
      )
    )
  })

  // `position` counts within a category: the CV groups by it.
  const perCategory = new Map<string, number>()
  for (const technology of seed.technologies) {
    const position = perCategory.get(technology.category) ?? 0
    perCategory.set(technology.category, position + 1)
    sql.push(
      upsert(
        "technology",
        {
          name: technology.name,
          category: technology.category,
          icon: technology.icon,
          position,
        },
        ["name"]
      )
    )
  }

  sql.push("DELETE FROM experience")
  seed.experience.forEach((row, index) => {
    const id = index + 1
    sql.push(
      insert("experience", {
        id,
        company_url: row.companyUrl,
        start_month: row.startMonth,
        end_month: row.endMonth,
        position: index,
      })
    )
    for (const [lang, t] of translationRows(row.translations)) {
      sql.push(
        insert("experience_translation", {
          experience_id: id,
          lang,
          company: t.company,
          role: t.role,
          location: t.location,
          bullets: t.bullets,
        })
      )
    }
    row.technologies.forEach((name, position) => {
      sql.push(
        insert("experience_technology", {
          experience_id: id,
          technology_id: idBy("technology", "name", name),
          position,
        })
      )
    })
  })

  sql.push("DELETE FROM education")
  seed.education.forEach((row, index) => {
    const id = index + 1
    sql.push(
      insert("education", {
        id,
        start_month: row.startMonth,
        end_month: row.endMonth,
        gpa: row.gpa,
        position: index,
      })
    )
    for (const [lang, t] of translationRows(row.translations)) {
      sql.push(
        insert("education_translation", {
          education_id: id,
          lang,
          institution: t.institution,
          degree: t.degree,
          diploma: t.diploma,
        })
      )
    }
  })

  sql.push("DELETE FROM certification")
  seed.certifications.forEach((row, index) => {
    sql.push(
      insert("certification", {
        id: index + 1,
        name: row.name,
        issuer: row.issuer,
        issued_month: row.issuedMonth,
        credential_url: row.credentialUrl,
        position: index,
      })
    )
  })

  seed.languages.forEach((row, position) => {
    sql.push(upsert("language_skill", { code: row.code, position }, ["code"]))
    for (const [lang, t] of translationRows(row.translations)) {
      sql.push(
        upsert(
          "language_skill_translation",
          {
            language_skill_id: idBy("language_skill", "code", row.code),
            lang,
            name: t.name,
            level: t.level,
          },
          ["language_skill_id", "lang"]
        )
      )
    }
  })

  seed.projects.forEach((row, position) => {
    const projectId = idBy("project", "slug", row.slug)
    sql.push(
      upsert(
        "project",
        {
          slug: row.slug,
          status: row.status,
          github_url: row.githubUrl,
          demo_url: row.demoUrl,
          featured: row.featured,
          in_cv: row.inCv,
          position,
        },
        ["slug"],
        { touch: true }
      )
    )
    for (const [lang, t] of translationRows(row.translations)) {
      sql.push(
        upsert(
          "project_translation",
          {
            project_id: projectId,
            lang,
            title: t.title,
            description: t.description,
            cv_bullets: t.cvBullets,
          },
          ["project_id", "lang"]
        )
      )
    }
    sql.push(
      `DELETE FROM project_technology WHERE project_id = ${projectId.sql}`
    )
    row.technologies.forEach((name, index) => {
      sql.push(
        insert("project_technology", {
          project_id: projectId,
          technology_id: idBy("technology", "name", name),
          position: index,
        })
      )
    })
  })

  return sql
}
