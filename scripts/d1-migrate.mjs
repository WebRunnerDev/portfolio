// Applies D1 migrations to the production database before `wrangler deploy`.
// Workers Builds runs it in the production deploy command:
//   npm run db:migrate && npx wrangler deploy
// Until stage 2 adds a D1 binding and the first migration, there is nothing to
// apply and it exits 0, so the deploy command can already include it.
import { execFileSync } from "node:child_process"
import { readdirSync } from "node:fs"

// Binding name of the D1 database in wrangler.jsonc (stage 2).
const BINDING = "DB"

const migrations = readdirSync(
  new URL("../migrations/", import.meta.url)
).filter((file) => file.endsWith(".sql"))

if (migrations.length === 0) {
  console.log("d1-migrate: no migrations in migrations/, skipping")
  process.exit(0)
}

execFileSync(
  "npx",
  ["wrangler", "d1", "migrations", "apply", BINDING, "--remote"],
  { stdio: "inherit", shell: process.platform === "win32" }
)
