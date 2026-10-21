import type { Lang } from "@contracts/lang"

// The SQL behind /api/admin/* (worker/README.md › Admin API). Every entity is
// described once by an `Entity`; the functions below read and write it with
// its Translations and links. Writes that touch more than one table go through
// `db.batch()`, which D1 runs as one transaction.

// A row as the API sees it: camelCase fields from contracts/api/admin.ts.
export type Values = Record<string, unknown>

// A link table to a directory: `project_technology` for `technologyIds`.
type Link = {
  field: string
  table: string
  // The link column that points at `target`.
  column: string
  target: string
  // The link table has `position`: the ids keep their order.
  ordered: boolean
}

export type Entity = {
  table: string
  // Untranslated fields, camelCase; each is the snake_case column of `table`.
  fields: readonly string[]
  // Fields stored as INTEGER 0/1.
  booleans?: readonly string[]
  // Fields that hold an R2 key: deleting the row deletes the file, unless
  // another row names it too.
  files?: readonly string[]
  // Fields that hold the id of a row in another table: `albumId` → `album`.
  refs?: Readonly<Record<string, string>>
  links?: readonly Link[]
  translation?: {
    fields: readonly string[]
    // Fields stored as JSON text.
    json?: readonly string[]
    // EN can't be removed (a photo caption can).
    enRequired: boolean
  }
  // The table has `position`: new rows go last, PUT /order sets it. With
  // `scope`, positions count within the rows sharing that field (an album's
  // photos).
  ordered?: boolean
  scope?: string
  // The list order when not `ordered`.
  orderBy?: string
  // The table has `updated_at`.
  touch?: boolean
  // Fills derived fields of the full row before it is written.
  normalize?: (row: Values) => Values
  // Checks of a PATCH to the row `id` that need D1, as validation messages by
  // field (an album's cover must be one of its photos).
  checkPatch?: (
    db: D1Database,
    id: number,
    patch: Values
  ) => Promise<Record<string, string[]> | undefined>
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

const column = (field: string) =>
  field.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)

function toColumn(value: unknown) {
  if (typeof value === "boolean") return value ? 1 : 0
  if (Array.isArray(value)) return JSON.stringify(value)
  return value ?? null
}

const translationTable = (entity: Entity) => `${entity.table}_translation`
const ownerColumn = (entity: Entity) => `${entity.table}_id`

// Reads the rows matching `where` (on `entity.table`, unaliased) with their
// Translations and links, in list order. One round trip.
async function load(
  db: D1Database,
  entity: Entity,
  where: string,
  params: unknown[]
): Promise<Values[]> {
  const { table, translation, links = [] } = entity
  const owners = `SELECT id FROM ${table} ${where}`
  const order = entity.ordered
    ? `${entity.scope ? `${column(entity.scope)}, ` : ""}position, id`
    : (entity.orderBy ?? "id")
  const statements = [
    db.prepare(`SELECT * FROM ${table} ${where} ORDER BY ${order}`),
    ...(translation
      ? [
          db.prepare(
            `SELECT * FROM ${translationTable(entity)}
            WHERE ${ownerColumn(entity)} IN (${owners})`
          ),
        ]
      : []),
    ...links.map((link) =>
      db.prepare(
        `SELECT ${ownerColumn(entity)} AS owner, ${link.column} AS target
        FROM ${link.table} WHERE ${ownerColumn(entity)} IN (${owners})
        ORDER BY ${link.ordered ? "position, " : ""}${link.column}`
      )
    ),
  ].map((statement) => statement.bind(...params))

  const [rows, ...rest] = await db.batch<Record<string, unknown>>(statements)
  const translations = translation ? rest.shift()!.results : []
  const byOwner = new Map<unknown, Values>()

  for (const row of rows.results) {
    const values: Values = { id: row.id }
    for (const field of entity.fields) {
      const value = row[column(field)]
      values[field] = entity.booleans?.includes(field) ? value === 1 : value
    }
    for (const link of links) values[link.field] = []
    if (translation) values.translations = {}
    byOwner.set(row.id, values)
  }

  for (const row of translations) {
    const values: Values = {}
    for (const field of translation!.fields) {
      const value = row[column(field)]
      values[field] = translation!.json?.includes(field)
        ? JSON.parse(value as string)
        : value
    }
    const owner = byOwner.get(row[ownerColumn(entity)])
    if (owner) (owner.translations as Values)[row.lang as string] = values
  }

  links.forEach((link, index) => {
    for (const row of rest[index].results) {
      const owner = byOwner.get(row.owner)
      if (owner) (owner[link.field] as unknown[]).push(row.target)
    }
  })

  return [...byOwner.values()]
}

// All rows; with `scopeValue`, only those of that scope (an album's photos).
export function list(db: D1Database, entity: Entity, scopeValue?: number) {
  return scopeValue === undefined || !entity.scope
    ? load(db, entity, "", [])
    : load(db, entity, `WHERE ${column(entity.scope)} = ?`, [scopeValue])
}

export async function find(
  db: D1Database,
  entity: Entity,
  id: number
): Promise<Values | undefined> {
  const [row] = await load(db, entity, "WHERE id = ?", [id])
  return row
}

// `refs` and `links` in `values` that point at rows that don't exist, as
// validation messages by field.
export async function missingRefs(
  db: D1Database,
  entity: Entity,
  values: Values
) {
  const checks = [
    ...Object.entries(entity.refs ?? {}).map(([field, target]) => ({
      field,
      target,
      ids: values[field] === undefined ? [] : [values[field] as number],
    })),
    ...(entity.links ?? []).map(({ field, target }) => ({
      field,
      target,
      ids: (values[field] as number[] | undefined) ?? [],
    })),
  ].filter((check) => check.ids.length > 0)
  if (checks.length === 0) return undefined

  const found = await db.batch<{ id: number }>(
    checks.map(({ target, ids }) =>
      db
        .prepare(
          `SELECT id FROM ${target} WHERE id IN (${ids.map(() => "?").join()})`
        )
        .bind(...ids)
    )
  )
  const fields: Record<string, string[]> = {}
  checks.forEach(({ field, ids }, index) => {
    const known = new Set(found[index].results.map((row) => row.id))
    const missing = ids.filter((id) => !known.has(id))
    if (missing.length > 0)
      fields[field] = [`Unknown id: ${missing.join(", ")}`]
  })
  return Object.keys(fields).length > 0 ? fields : undefined
}

// Statements that replace the links in `values` of the row `ownerSql` (an id
// placeholder or a subquery).
function linkStatements(
  db: D1Database,
  entity: Entity,
  ownerSql: string,
  ownerParams: unknown[],
  values: Values,
  replace: boolean
) {
  return (entity.links ?? [])
    .filter((link) => values[link.field] !== undefined)
    .flatMap((link) => [
      ...(replace
        ? [
            db
              .prepare(
                `DELETE FROM ${link.table} WHERE ${ownerColumn(entity)} = ${ownerSql}`
              )
              .bind(...ownerParams),
          ]
        : []),
      ...(values[link.field] as number[]).map((target, position) =>
        db
          .prepare(
            link.ordered
              ? `INSERT INTO ${link.table} (${ownerColumn(entity)}, ${link.column}, position)
                VALUES (${ownerSql}, ?, ?)`
              : `INSERT INTO ${link.table} (${ownerColumn(entity)}, ${link.column})
                VALUES (${ownerSql}, ?)`
          )
          .bind(...ownerParams, target, ...(link.ordered ? [position] : []))
      ),
    ])
}

// Upserts one Translation of the row `ownerSql`.
export function translationStatement(
  db: D1Database,
  entity: Entity,
  ownerSql: string,
  ownerParams: unknown[],
  lang: Lang,
  values: Values
) {
  const fields = entity.translation!.fields
  const columns = fields.map(column)
  return db
    .prepare(
      `INSERT INTO ${translationTable(entity)}
        (${ownerColumn(entity)}, lang, ${columns.join()})
      VALUES (${ownerSql}, ?, ${columns.map(() => "?").join()})
      ON CONFLICT (${ownerColumn(entity)}, lang) DO UPDATE SET
        ${columns.map((name) => `${name} = excluded.${name}`).join()}`
    )
    .bind(
      ...ownerParams,
      lang,
      ...fields.map((field) => toColumn(values[field]))
    )
}

function translationStatements(
  db: D1Database,
  entity: Entity,
  ownerSql: string,
  ownerParams: unknown[],
  translations: Values | undefined
) {
  return Object.entries(translations ?? {})
    .filter(([, values]) => values !== undefined)
    .map(([lang, values]) =>
      translationStatement(
        db,
        entity,
        ownerSql,
        ownerParams,
        lang as Lang,
        values as Values
      )
    )
}

// Inserts a row with its Translations and links; returns its id.
export async function create(
  db: D1Database,
  entity: Entity,
  input: Values
): Promise<number> {
  const values = entity.normalize ? entity.normalize(input) : input
  const columns = entity.fields.map(column)
  const placeholders = columns.map(() => "?")
  const params = entity.fields.map((field) => toColumn(values[field]))
  if (entity.ordered) {
    const scope = entity.scope
    columns.push("position")
    placeholders.push(
      `(SELECT coalesce(max(position), -1) + 1 FROM ${entity.table}
      ${scope ? `WHERE ${column(scope)} = ?` : ""})`
    )
    if (scope) params.push(toColumn(values[scope]))
  }
  // No AUTOINCREMENT: the new row has the largest id until the batch commits.
  const newId = `(SELECT max(id) FROM ${entity.table})`
  const results = await db.batch<{ id: number }>([
    db
      .prepare(
        `INSERT INTO ${entity.table} (${columns.join()})
        VALUES (${placeholders.join()})`
      )
      .bind(...params),
    ...translationStatements(
      db,
      entity,
      newId,
      [],
      values.translations as Values | undefined
    ),
    ...linkStatements(db, entity, newId, [], values, false),
    db.prepare(`SELECT ${newId} AS id`),
  ])
  return results.at(-1)!.results[0].id
}

// Applies a PATCH to an existing row (`current`, from `find`). Translations in
// `patch.translations` are upserted, the others kept.
export async function update(
  db: D1Database,
  entity: Entity,
  current: Values,
  patch: Values
) {
  const merged = { ...current, ...patch }
  const values = entity.normalize ? entity.normalize(merged) : merged
  const sets = entity.fields.map((field) => `${column(field)} = ?`)
  if (entity.touch) sets.push(`updated_at = ${NOW}`)
  await db.batch([
    db
      .prepare(`UPDATE ${entity.table} SET ${sets.join()} WHERE id = ?`)
      .bind(
        ...entity.fields.map((field) => toColumn(values[field])),
        current.id
      ),
    ...translationStatements(
      db,
      entity,
      "?",
      [current.id],
      patch.translations as Values | undefined
    ),
    ...linkStatements(db, entity, "?", [current.id], patch, true),
  ])
}

// False when there was no such row.
export async function remove(db: D1Database, entity: Entity, id: number) {
  const { meta } = await db
    .prepare(`DELETE FROM ${entity.table} WHERE id = ?`)
    .bind(id)
    .run()
  return meta.changes > 0
}

// Statement that bumps `updated_at` of the row with this id, if it has one.
function touchStatements(db: D1Database, entity: Entity, id: number) {
  return entity.touch
    ? [
        db
          .prepare(
            `UPDATE ${entity.table} SET updated_at = ${NOW} WHERE id = ?`
          )
          .bind(id),
      ]
    : []
}

export async function putTranslation(
  db: D1Database,
  entity: Entity,
  id: number,
  lang: Lang,
  values: Values
) {
  await db.batch([
    translationStatement(db, entity, "?", [id], lang, values),
    ...touchStatements(db, entity, id),
  ])
}

// False when the row had no Translation on that Lang.
export async function removeTranslation(
  db: D1Database,
  entity: Entity,
  id: number,
  lang: Lang
) {
  const [{ meta }] = await db.batch([
    db
      .prepare(
        `DELETE FROM ${translationTable(entity)}
        WHERE ${ownerColumn(entity)} = ? AND lang = ?`
      )
      .bind(id, lang),
    ...touchStatements(db, entity, id),
  ])
  return meta.changes > 0
}

// Sets `position` to the index in `ids`, in one batch. Writes nothing and
// returns a message when an id doesn't exist or, with `scope`, the ids
// belong to more than one scope (photos of two albums).
export async function reorder(db: D1Database, entity: Entity, ids: number[]) {
  const scope = entity.scope ? column(entity.scope) : "NULL"
  const { results } = await db
    .prepare(
      `SELECT id, ${scope} AS scope FROM ${entity.table}
      WHERE id IN (${ids.map(() => "?").join()})`
    )
    .bind(...ids)
    .all<{ id: number; scope: unknown }>()
  const known = new Set(results.map((row) => row.id))
  const missing = ids.filter((id) => !known.has(id))
  if (missing.length > 0) return `Unknown id: ${missing.join(", ")}`
  if (new Set(results.map((row) => row.scope)).size > 1) {
    return `Ids must share one ${entity.scope}`
  }
  await db.batch(
    ids.map((id, position) =>
      db
        .prepare(`UPDATE ${entity.table} SET position = ? WHERE id = ?`)
        .bind(position, id)
    )
  )
  return undefined
}
