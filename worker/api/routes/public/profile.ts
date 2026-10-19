import { Hono } from "hono"
import type { Profile } from "@contracts/api/public"
import type { Lang } from "@contracts/lang"
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

// The Profile on a Lang, null until the owner fills it in. Meta Injection of
// the CV reads it too.
export async function readProfile(
  db: D1Database,
  lang: Lang
): Promise<Profile | null> {
  const row = await db
    .prepare(
      `SELECT t.lang <> ?1 AS fallback, t.name, t.headline, t.about,
        t.location, p.email, p.telegram_url, p.linkedin_url, p.github_url,
        p.photo_key
      FROM profile p JOIN ${translationOf("profile", "p")}`
    )
    .bind(lang)
    .first<ProfileRow>()
  if (!row) return null
  return {
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
  }
}

// 404 until the owner fills in the Profile.
export const profile = new Hono<PublicEnv>()
  .get("/", async (c) => {
    const found = await readProfile(c.env.DB, c.var.lang)
    if (!found) return apiError(c, 404, "not_found")
    return c.json(found satisfies Profile)
  })
  .all("/", methodNotAllowed("GET, HEAD"))
