import { Hono } from "hono"
import { createMiddleware } from "hono/factory"
import { isLang, type Lang } from "@contracts/lang"
import type { ApiEnv } from "./app"
import { apiError } from "./errors"

// GET /api/public/:lang/* (worker/README.md › Public API).
export type PublicEnv = ApiEnv & { Variables: { lang: Lang } }

// Short, so an edit in the admin shows up within a minute.
export const PUBLIC_CACHE_CONTROL = "public, max-age=60"

const requireLang = createMiddleware<PublicEnv>(async (c, next) => {
  const lang = c.req.param("lang")
  if (!isLang(lang)) return apiError(c, 400, "invalid_request")
  c.set("lang", lang)
  await next()
  if (c.res.status === 200) {
    c.header("Cache-Control", PUBLIC_CACHE_CONTROL)
  }
})

// Mounted at /public/:lang; every route under it is checked for the Lang.
export function createPublicApp() {
  return new Hono<PublicEnv>().use(requireLang)
}

// SQL that joins the Translation of `<table>` row `owner` (as `t`): on the
// request Lang (bound as ?1) if there is one, else on EN (CONTEXT.md ›
// Fallback). Select `t.lang <> ?1 AS fallback` with it. As an inner join it
// drops rows translated on neither.
export function translationOf(table: string, owner: string) {
  const fk = `${table}_id`
  return `${table}_translation t ON t.${fk} = ${owner}.id AND t.lang = (
    SELECT lang FROM ${table}_translation
    WHERE ${fk} = ${owner}.id AND lang IN (?1, 'en')
    ORDER BY lang = ?1 DESC LIMIT 1
  )`
}

// SQL for a JSON array of the technologies linked to `owner` through
// `<table>_technology`, in link order. Parse it with `parseJson`.
export function technologiesOf(table: string, owner: string) {
  return `(
    SELECT json_group_array(json_object(
      'id', id, 'name', name, 'category', category, 'icon', icon
    ))
    FROM (
      SELECT tech.* FROM ${table}_technology link
      JOIN technology tech ON tech.id = link.technology_id
      WHERE link.${table}_id = ${owner}.id
      ORDER BY link.position, tech.name
    )
  )`
}

// JSON columns (bullet lists, `technologiesOf`) come out of D1 as text.
export function parseJson<T>(text: string): T {
  return JSON.parse(text) as T
}
