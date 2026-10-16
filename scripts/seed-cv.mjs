// Fills D1 with the CV from docs/private/seed.json (gitignored; the structure
// is in docs/private/seed.example.json). Running it again changes nothing
// (migrations/README.md › Seeding the CV).
//   npm run db:seed-cv                       — the local D1 of `npm run dev`
//   npm run db:seed-cv -- --remote           — production
//   npm run db:seed-cv -- --remote --preview — the Preview database
//   npm run db:seed-cv -- --file <path>      — another seed file
// Other flags (`--persist-to <dir>`) go to `wrangler d1 execute` as they are.
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { runnerImport } from "vite"

const args = process.argv.slice(2)
const fileFlag = args.indexOf("--file")
const seedFile =
  fileFlag === -1
    ? fileURLToPath(new URL("../docs/private/seed.json", import.meta.url))
    : args.splice(fileFlag, 2)[1]
const target = args.includes("--remote") ? args : ["--local", ...args]

// build.ts imports contracts/ in TypeScript; Vite loads it the way the app does.
const { module } = await runnerImport(
  fileURLToPath(new URL("./seed-cv/build.ts", import.meta.url)),
  { configFile: false, logLevel: "error" }
)
const statements = module.buildSeedSql(
  JSON.parse(readFileSync(seedFile, "utf8"))
)

// The SQL holds personal data: it lives in a temp dir only while it runs.
const dir = mkdtempSync(join(tmpdir(), "seed-cv-"))
try {
  const sqlFile = join(dir, "seed-cv.sql")
  writeFileSync(sqlFile, statements.map((s) => `${s};\n`).join(""))
  execFileSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)
      ),
      "d1",
      "execute",
      "DB",
      ...target,
      "--file",
      sqlFile,
      "--yes",
    ],
    { stdio: "inherit" }
  )
} finally {
  rmSync(dir, { recursive: true, force: true })
}
console.log(`seed-cv: ${statements.length} statements from ${seedFile}`)
