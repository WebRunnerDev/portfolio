import { Hono } from "hono"
import type { Profile } from "@contracts/api/public"
import { apiError, methodNotAllowed } from "../../errors"
import { translationOf, type PublicEnv } from "../../public"

type ProfileRow = {
  fallback: number
  name: string
  headline: string
  about: string | null
  location: string | null
  email: string | null
  telegram_url: string | null
  linkedin_url: string | null
  github_url: string | null
  photo_key: string | null
}

// 404 until the owner fills in the Profile.
export const profile = new Hono<PublicEnv>()
  .get("/", async (c) => {
    const row = await c.env.DB.prepare(
      `SELECT t.lang <> ?1 AS fallback, t.name, t.headline, t.about,
        t.location, p.email, p.telegram_url, p.linkedin_url, p.github_url,
        p.photo_key
      FROM profile p JOIN ${translationOf("profile", "p")}`
    )
      .bind(c.var.lang)
      .first<ProfileRow>()
    if (!row) return apiError(c, 404, "not_found")
    return c.json({
      fallback: row.fallback === 1,
      name: row.name,
      headline: row.headline,
      about: row.about,
      location: row.location,
      email: row.email,
      telegramUrl: row.telegram_url,
      linkedinUrl: row.linkedin_url,
      githubUrl: row.github_url,
      photoKey: row.photo_key,
    } satisfies Profile)
  })
  .all("/", methodNotAllowed("GET, HEAD"))
