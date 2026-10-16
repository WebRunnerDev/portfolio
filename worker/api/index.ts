import { Hono } from "hono"
import { requireAccess, type AdminEnv } from "./access"
import { createApp } from "./app"
import { createPublicApp } from "./public"
import { adminMe } from "./routes/admin-me"
import { health } from "./routes/health"
import { albums } from "./routes/public/albums"
import {
  certifications,
  cvSections,
  education,
  experience,
  languages,
  technologies,
} from "./routes/public/cv"
import { posts } from "./routes/public/posts"
import { profile } from "./routes/public/profile"
import { projects } from "./routes/public/projects"
import { tracks } from "./routes/public/tracks"

// Everything under /api/admin/* goes through the Access check first, unknown
// paths included, so they answer 401 rather than 404.
const admin = new Hono<AdminEnv>().use(requireAccess).route("/me", adminMe)

// Everything under /api/public/:lang/* checks the Lang first (400 if unknown).
const publicApi = createPublicApp()
  .route("/profile", profile)
  .route("/cv-sections", cvSections)
  .route("/experience", experience)
  .route("/education", education)
  .route("/certifications", certifications)
  .route("/languages", languages)
  .route("/technologies", technologies)
  .route("/projects", projects)
  .route("/posts", posts)
  .route("/albums", albums)
  .route("/tracks", tracks)

// One route module per endpoint (worker/README.md › API).
export const api = createApp()
  .basePath("/api")
  .route("/health", health)
  .route("/admin", admin)
  .route("/public/:lang", publicApi)
