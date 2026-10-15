import { Hono } from "hono"
import { requireAccess, type AdminEnv } from "./access"
import { createApp } from "./app"
import { adminMe } from "./routes/admin-me"
import { health } from "./routes/health"

// Everything under /api/admin/* goes through the Access check first, unknown
// paths included, so they answer 401 rather than 404.
const admin = new Hono<AdminEnv>().use(requireAccess).route("/me", adminMe)

// One route module per endpoint (worker/README.md › API).
export const api = createApp()
  .basePath("/api")
  .route("/health", health)
  .route("/admin", admin)
