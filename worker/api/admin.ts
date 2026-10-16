import { sValidator } from "@hono/standard-validator"
import { Hono, type Context } from "hono"
import type * as v from "valibot"
import { ReorderSchema } from "@contracts/api/admin"
import { isLang } from "@contracts/lang"
import type { AdminEnv } from "./access"
import {
  create,
  find,
  list,
  missingRefs,
  putTranslation,
  remove,
  removeTranslation,
  reorder,
  update,
  type Entity,
  type Values,
} from "./admin-store"
import {
  apiError,
  methodNotAllowed,
  rejectInvalidFields,
  validationFailed,
} from "./errors"

// /api/admin/<entity> (worker/README.md › Admin API): the same routes for
// every entity, built from its `Entity` and its schemas in
// contracts/api/admin.ts.
type Schemas = {
  create: v.GenericSchema
  patch: v.GenericSchema
  translation?: v.GenericSchema
}

const ID = "/:id{[1-9][0-9]*}"

function body<S extends v.GenericSchema>(schema: S) {
  return sValidator("json", schema, rejectInvalidFields)
}

// The Lang of /translations/:lang, or a 400 answer.
function langParam(c: Context) {
  const lang = c.req.param("lang")
  return isLang(lang) ? lang : undefined
}

export function crudRoutes(entity: Entity, schemas: Schemas) {
  const app = new Hono<AdminEnv>()

  if (entity.ordered) {
    app
      .put("/order", body(ReorderSchema), async (c) => {
        const missing = await reorder(c.env.DB, entity, c.req.valid("json").ids)
        if (missing.length > 0) {
          return validationFailed(c, {
            ids: [`Unknown id: ${missing.join(", ")}`],
          })
        }
        return c.body(null, 204)
      })
      .all("/order", methodNotAllowed("PUT"))
  }

  app
    // `?<scope>=<id>` narrows the list (an album's photos).
    .get("/", async (c) => {
      const scope = entity.scope && c.req.query(entity.scope)
      if (scope !== undefined && scope !== "" && !/^[1-9]\d*$/.test(scope)) {
        return apiError(c, 400, "invalid_request")
      }
      return c.json(
        await list(c.env.DB, entity, scope ? Number(scope) : undefined)
      )
    })
    .post("/", body(schemas.create), async (c) => {
      const values = c.req.valid("json") as Values
      const missing = await missingRefs(c.env.DB, entity, values)
      if (missing) return validationFailed(c, missing)
      const id = await create(c.env.DB, entity, values)
      return c.json(await find(c.env.DB, entity, id), 201)
    })
    .get(ID, async (c) => {
      const row = await find(c.env.DB, entity, Number(c.req.param("id")))
      return row ? c.json(row) : apiError(c, 404, "not_found")
    })
    .patch(ID, body(schemas.patch), async (c) => {
      const id = Number(c.req.param("id"))
      const current = await find(c.env.DB, entity, id)
      if (!current) return apiError(c, 404, "not_found")
      const patch = c.req.valid("json") as Values
      const missing = await missingRefs(c.env.DB, entity, patch)
      if (missing) return validationFailed(c, missing)
      await update(c.env.DB, entity, current, patch)
      return c.json(await find(c.env.DB, entity, id))
    })
    .delete(ID, async (c) => {
      const removed = await remove(c.env.DB, entity, Number(c.req.param("id")))
      return removed ? c.body(null, 204) : apiError(c, 404, "not_found")
    })
    .all("/", methodNotAllowed("GET, HEAD, POST"))
    .all(ID, methodNotAllowed("GET, HEAD, PATCH, DELETE"))

  if (schemas.translation) {
    app.route(
      `${ID}/translations`,
      translationRoutes(entity, schemas.translation, (c) =>
        Number(c.req.param("id"))
      )
    )
  }

  return app
}

// PUT and DELETE /:lang: one Translation of the row `idOf(c)`.
export function translationRoutes(
  entity: Entity,
  schema: v.GenericSchema,
  idOf: (c: Context) => number
) {
  const LANG = "/:lang"
  return new Hono<AdminEnv>()
    .put(LANG, body(schema), async (c) => {
      const lang = langParam(c)
      if (!lang) return apiError(c, 400, "invalid_request")
      const id = idOf(c)
      if (!(await find(c.env.DB, entity, id))) {
        return apiError(c, 404, "not_found")
      }
      await putTranslation(
        c.env.DB,
        entity,
        id,
        lang,
        c.req.valid("json") as Values
      )
      return c.json(await find(c.env.DB, entity, id))
    })
    .delete(LANG, async (c) => {
      const lang = langParam(c)
      if (!lang) return apiError(c, 400, "invalid_request")
      // EN is what every other Lang falls back to (CONTEXT.md › Fallback).
      if (lang === "en" && entity.translation?.enRequired) {
        return apiError(c, 409, "conflict")
      }
      const removed = await removeTranslation(c.env.DB, entity, idOf(c), lang)
      return removed ? c.body(null, 204) : apiError(c, 404, "not_found")
    })
    .all(LANG, methodNotAllowed("PUT, DELETE"))
}
