import { sValidator } from "@hono/standard-validator"
import { Hono } from "hono"
import { ProfileAdmin } from "@contracts/api/admin"
import type { AdminEnv } from "../../access"
import { translationRoutes } from "../../admin"
import { create, find, update, type Entity } from "../../admin-store"
import { apiError, methodNotAllowed, rejectInvalidFields } from "../../errors"

// The Profile is a single row (id = 1): no list, no id in the path, no delete.
// PUT creates it or overwrites its fields; the Translations in the body are
// written, the others kept.
const PROFILE_ID = 1

const profile: Entity = {
  table: "profile",
  fields: ["email", "telegramUrl", "linkedinUrl", "githubUrl", "photoKey"],
  translation: {
    fields: ["name", "headline", "about", "location"],
    enRequired: true,
  },
  touch: true,
}

export const profileAdmin = new Hono<AdminEnv>()
  // 404 until the first PUT.
  .get("/", async (c) => {
    const row = await find(c.env.DB, profile, PROFILE_ID)
    return row ? c.json(row) : apiError(c, 404, "not_found")
  })
  .put(
    "/",
    sValidator("json", ProfileAdmin.create, rejectInvalidFields),
    async (c) => {
      const values = c.req.valid("json")
      const current = await find(c.env.DB, profile, PROFILE_ID)
      if (current) await update(c.env.DB, profile, current, values)
      else await create(c.env.DB, profile, values)
      return c.json(await find(c.env.DB, profile, PROFILE_ID))
    }
  )
  .patch(
    "/",
    sValidator("json", ProfileAdmin.patch, rejectInvalidFields),
    async (c) => {
      const current = await find(c.env.DB, profile, PROFILE_ID)
      if (!current) return apiError(c, 404, "not_found")
      await update(c.env.DB, profile, current, c.req.valid("json"))
      return c.json(await find(c.env.DB, profile, PROFILE_ID))
    }
  )
  .all("/", methodNotAllowed("GET, HEAD, PUT, PATCH"))
  .route(
    "/translations",
    translationRoutes(profile, ProfileAdmin.translation, () => PROFILE_ID)
  )
