// Setup file of the `worker` Vitest project: every test file starts with the
// schema from migrations/ (passed in by vite.config.ts as TEST_MIGRATIONS).
import { applyD1Migrations, type D1Migration } from "cloudflare:test"
import { env } from "cloudflare:workers"

const { DB, TEST_MIGRATIONS } = env as Env & {
  TEST_MIGRATIONS: D1Migration[]
}

await applyD1Migrations(DB, TEST_MIGRATIONS)
