// Applies D1 migrations to a remote database.
//   npm run db:migrate          — production; Workers Builds runs it in the
//                                 production deploy command before
//                                 `npx wrangler deploy`
//   npm run db:migrate:preview  — the Preview database, by hand
// With no migrations in migrations/ it does nothing and exits 0.
import { execFileSync } from "node:child_process"
import { readdirSync } from "node:fs"

// Binding name of the D1 database in wrangler.jsonc.
const BINDING = "DB"

const migrations = readdirSync(
  new URL("../migrations/", import.meta.url)
).filter((file) => file.endsWith(".sql"))

if (migrations.length === 0) {
  console.log("d1-migrate: no migrations in migrations/, skipping")
  process.exit(0)
}

// `--preview` targets `preview_database_id` of the binding.
const preview = process.argv.includes("--preview") ? ["--preview"] : []

execFileSync(
  "npx",
  ["wrangler", "d1", "migrations", "apply", BINDING, "--remote", ...preview],
  { stdio: "inherit", shell: process.platform === "win32" }
)
