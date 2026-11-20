// Applies migrations/ to a clean local D1 with the same command developers run,
// then checks the resulting schema through the `DB` binding.
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { getPlatformProxy } from "wrangler"
import { PROJECT_STATUSES } from "../contracts/api/public.ts"
import { LANGS } from "../contracts/lang.ts"

// The part of D1Database used here. The real type lives in the Worker's
// globals (worker-configuration.d.ts), which clash with Node's in this project.
type Statement = {
  bind(...values: unknown[]): Statement
  all<T>(): Promise<{ results: T[] }>
  first<T>(): Promise<T | null>
  run(): Promise<unknown>
}
type Database = {
  prepare(sql: string): Statement
  batch(statements: Statement[]): Promise<unknown>
}
type TestEnv = { DB: Database }

const persistTo = mkdtempSync(join(tmpdir(), "d1-migrations-"))

let proxy: Awaited<ReturnType<typeof getPlatformProxy<TestEnv>>>
let db: Database

beforeAll(async () => {
  execFileSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)
      ),
      "d1",
      "migrations",
      "apply",
      "DB",
      "--local",
      "--persist-to",
      persistTo,
    ],
    {
      stdio: "pipe",
      // Answers the confirmation prompt.
      env: { ...process.env, CI: "1" },
    }
  )
  proxy = await getPlatformProxy<TestEnv>({
    persist: { path: join(persistTo, "v3") },
  })
  db = proxy.env.DB
}, 120_000)

afterAll(async () => {
  await proxy?.dispose()
  rmSync(persistTo, { recursive: true, force: true })
})

async function tableNames(): Promise<string[]> {
  const { results } = await db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('d1_migrations', '_cf_KV', '_cf_METADATA')"
    )
    .all<{ name: string }>()
  return results.map((r) => r.name)
}

async function tableSql(name: string): Promise<string> {
  const row = await db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .bind(name)
    .first<{ sql: string }>()
  return row?.sql ?? ""
}

async function columns(table: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT name FROM pragma_table_info(?)")
    .bind(table)
    .all<{ name: string }>()
  return results.map((r) => r.name)
}

describe("D1 migrations", () => {
  it("creates every table of the data model", async () => {
    expect((await tableNames()).sort()).toEqual(
      [
        "album",
        "album_translation",
        "certification",
        "cv_pdf",
        "cv_section",
        "education",
        "education_translation",
        "experience",
        "experience_technology",
        "experience_translation",
        "language_skill",
        "language_skill_translation",
        "photo",
        "photo_translation",
        "post",
        "post_tag",
        "post_translation",
        "profile",
        "profile_translation",
        "project",
        "project_technology",
        "project_translation",
        "tag",
        "technology",
        "track",
      ].sort()
    )
  })

  it("checks `lang` against LANGS in every table that has it", async () => {
    const withLang = []
    for (const table of await tableNames()) {
      if (!(await columns(table)).includes("lang")) continue
      withLang.push(table)
      const list = /lang IN \(([^)]*)\)/.exec(await tableSql(table))?.[1]
      const langs = list?.split(",").map((s) => s.trim().replace(/'/g, ""))
      expect(langs, table).toEqual([...LANGS])
    }
    const translations = (await tableNames()).filter((t) =>
      t.endsWith("_translation")
    )
    expect(withLang).toEqual(
      expect.arrayContaining([...translations, "cv_pdf"])
    )
  })

  it("checks a Project's status against the contract", async () => {
    const list = /status IN \(([^)]*)\)/.exec(await tableSql("project"))?.[1]
    const statuses = list?.split(",").map((s) => s.trim().replace(/'/g, ""))
    expect(statuses).toEqual([...PROJECT_STATUSES])
  })

  it("keeps a Project's Translations and links through its rebuild", async () => {
    // 0004 rebuilt `project`: its indexes are back, and a Project still
    // takes Translations and Technologies and deletes them with it.
    const { results } = await db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'project' AND name LIKE 'project_%'"
      )
      .all<{ name: string }>()
    expect(results.map((r) => r.name).sort()).toEqual([
      "project_featured_position",
      "project_in_cv_position",
      "project_position",
    ])
    await db.batch([
      db.prepare(
        "INSERT INTO project (id, slug, status) VALUES (7, 'plotops', 'maintained')"
      ),
      db.prepare(
        "INSERT INTO project_translation (project_id, lang, title, description) VALUES (7, 'en', 'PlotOps', 'Tracker')"
      ),
      db.prepare(
        "INSERT INTO technology (id, name, category) VALUES (7, 'D1', 'backend_cloud')"
      ),
      db.prepare(
        "INSERT INTO project_technology (project_id, technology_id) VALUES (7, 7)"
      ),
      db.prepare("DELETE FROM project WHERE id = 7"),
    ])
    const left = await db
      .prepare(
        "SELECT (SELECT count(*) FROM project_translation WHERE project_id = 7) + (SELECT count(*) FROM project_technology WHERE project_id = 7) AS n"
      )
      .first<{ n: number }>()
    expect(left?.n).toBe(0)
    await expect(
      db
        .prepare(
          "INSERT INTO project (id, slug, status) VALUES (8, 'x', 'paused')"
        )
        .run()
    ).rejects.toThrow(/CHECK constraint failed/)
  })

  it("keeps the phone out of the profile", async () => {
    for (const table of ["profile", "profile_translation"]) {
      for (const column of await columns(table)) {
        expect(column).not.toMatch(/phone/i)
      }
    }
  })

  it("rejects a Translation in an unsupported Lang", async () => {
    await db.prepare("INSERT INTO post (id, slug) VALUES (1, 'hello')").run()
    await expect(
      db
        .prepare(
          "INSERT INTO post_translation (post_id, lang, title) VALUES (1, 'fr', 'Bonjour')"
        )
        .run()
    ).rejects.toThrow(/CHECK constraint failed/)
  })

  it("deletes Translations and links with their entity", async () => {
    await db.batch([
      db.prepare("INSERT INTO post (id, slug) VALUES (2, 'cascade')"),
      db.prepare(
        "INSERT INTO post_translation (post_id, lang, title) VALUES (2, 'en', 'Cascade'), (2, 'ar', 'Cascade')"
      ),
      db.prepare("INSERT INTO tag (id, slug, name) VALUES (1, 'd1', 'D1')"),
      db.prepare("INSERT INTO post_tag (post_id, tag_id) VALUES (2, 1)"),
      db.prepare("DELETE FROM post WHERE id = 2"),
    ])
    const left = await db
      .prepare(
        "SELECT (SELECT count(*) FROM post_translation WHERE post_id = 2) + (SELECT count(*) FROM post_tag WHERE post_id = 2) AS n"
      )
      .first<{ n: number }>()
    expect(left?.n).toBe(0)
  })

  it("keeps an album with photos from being deleted", async () => {
    await db.batch([
      db.prepare("INSERT INTO album (id, slug) VALUES (1, 'trip')"),
      db.prepare(
        "INSERT INTO photo (album_id, r2_key, width, height) VALUES (1, 'photos/1.jpg', 800, 600)"
      ),
    ])
    await expect(
      db.prepare("DELETE FROM album WHERE id = 1").run()
    ).rejects.toThrow(/FOREIGN KEY constraint failed/)
  })
})
