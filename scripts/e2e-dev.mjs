// `vite dev` for the e2e tests of the Admin against the real Worker
// (playwright.config.ts, project `dev`): a fresh local D1 and R2 of their
// own in .wrangler/e2e, migrated first, and Access passed by
// ACCESS_DEV_EMAIL as with .dev.vars (worker/README.md › Admin access).
//   node scripts/e2e-dev.mjs <port>
import { execFileSync, spawn } from "node:child_process"
import { rmSync } from "node:fs"

const STATE = ".wrangler/e2e"
const port = process.argv[2] ?? "5174"
const shell = process.platform === "win32"

rmSync(STATE, { recursive: true, force: true })
execFileSync(
  "npx",
  [
    "wrangler",
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--persist-to",
    STATE,
  ],
  { stdio: "inherit", shell, env: { ...process.env, CI: "true" } }
)

const vite = spawn("npx", ["vite", "--port", port, "--strictPort"], {
  stdio: "inherit",
  shell,
  env: {
    ...process.env,
    // vite.config.ts keeps the Worker's local state there.
    E2E_STATE: STATE,
    // Hands the variables below to the Worker; .dev.vars stays untouched.
    CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
    ACCESS_DEV_EMAIL: "e2e@example.com",
  },
})
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => vite.kill(signal))
}
vite.on("exit", (code) => process.exit(code ?? 0))
