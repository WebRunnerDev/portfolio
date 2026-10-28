// The production build with content, for Lighthouse CI (lighthouserc.json) and
// the axe tests (playwright.config.ts, project `audit`): `vite preview` over a
// fresh local D1 and R2 of its own in .wrangler/audit, migrated and filled
// from scripts/audit/seed.sql. Expects dist/ to be built.
//   node scripts/audit/server.mjs <port>
import { execFileSync, spawn } from "node:child_process"
import { rmSync } from "node:fs"

const STATE = ".wrangler/audit"
const port = process.argv[2] ?? "4175"
const shell = process.platform === "win32"

const wrangler = (...args) =>
  execFileSync("npx", ["wrangler", ...args, "--local", "--persist-to", STATE], {
    stdio: "inherit",
    shell,
    env: { ...process.env, CI: "true" },
  })

rmSync(STATE, { recursive: true, force: true })
wrangler("d1", "migrations", "apply", "DB")
wrangler("d1", "execute", "DB", "--file", "scripts/audit/seed.sql")
// Local runs bind MEDIA to `preview_bucket_name` (wrangler.jsonc).
wrangler(
  "r2",
  "object",
  "put",
  "webrunner-media-preview/image/audit.png",
  "--file",
  "public/og-default.png",
  "--content-type",
  "image/png"
)

const vite = spawn(
  "npx",
  ["vite", "preview", "--port", port, "--strictPort"],
  // vite.config.ts keeps the Worker's local state there.
  { stdio: "inherit", shell, env: { ...process.env, E2E_STATE: STATE } }
)
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => vite.kill(signal))
}
vite.on("exit", (code) => process.exit(code ?? 0))
