import * as v from "valibot"

import type { Values } from "../api/admin-api"
import type { EntityConfig, Field } from "../model/entities"

// The create form: raw input values by field name (text as typed, checkbox
// state), turned into the POST body of contracts/api/admin.ts.
export type FormValues = Record<string, string | boolean>

// Messages by dot path, as the API's 422 `fields`.
export type FieldErrors = Record<string, string[]>

export function fieldPath(field: Field) {
  return field.translated ? `translations.en.${field.name}` : field.name
}

export function initialValues(
  fields: Field[],
  preset: Values = {}
): FormValues {
  const values: FormValues = {}
  for (const field of fields) {
    if (field.kind === "boolean") values[field.name] = field.initial
    else if (field.kind === "select")
      values[field.name] = field.initial ?? field.options[0]
    else values[field.name] = ""
    const given = preset[field.name]
    if (given !== undefined && given !== null) {
      values[field.name] = typeof given === "boolean" ? given : String(given)
    }
  }
  return values
}

function inputValue(field: Field, raw: string | boolean | undefined) {
  if (field.kind === "boolean") return raw === true
  if (typeof raw !== "string" || raw.trim() === "") return undefined
  switch (field.kind) {
    case "lines":
      return raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    case "number":
    case "ref":
      return Number(raw)
    default:
      return raw
  }
}

// Empty inputs are left out, so the schema's default applies. `extra` holds
// what an upload filled in (a photo's size).
export function buildBody(
  entity: EntityConfig,
  values: FormValues,
  extra: Values = {}
): Values {
  const body: Values = {}
  const translation: Values = {}
  for (const field of entity.createFields) {
    const value = inputValue(field, values[field.name])
    if (value === undefined) continue
    if (field.translated) translation[field.name] = value
    else body[field.name] = value
  }
  Object.assign(body, extra)
  if (
    entity.translated &&
    (Object.keys(translation).length > 0 ||
      isRequired(entity.schemas.create, "translations.en"))
  ) {
    body.translations = { en: translation }
  }
  return body
}

type WithEntries = { type: string; entries?: Record<string, v.GenericSchema> }

// Whether the object schema needs the value at `path` (no optional on the way).
export function isRequired(schema: v.GenericSchema, path: string) {
  let current = schema as WithEntries
  for (const key of path.split(".")) {
    const next = current.entries?.[key] as WithEntries | undefined
    if (!next || next.type === "optional" || next.type === "nullish") {
      return false
    }
    current = next
  }
  return true
}

// The same checks as the Worker's, before the round trip: "Required" for a
// missing value, the schema's message for a bad one.
export function validateBody(entity: EntityConfig, body: Values): FieldErrors {
  const errors: FieldErrors = {}
  const result = v.safeParse(entity.schemas.create, body)
  if (!result.success) {
    const { root, nested } = v.flatten(result.issues)
    if (root) errors[""] = root
    for (const [path, messages] of Object.entries(nested ?? {})) {
      if (messages) errors[path] = messages
    }
  }
  for (const field of entity.createFields) {
    const path = fieldPath(field)
    if (!isRequired(entity.schemas.create, path)) continue
    const translations = body.translations as Record<string, Values> | undefined
    const value = field.translated
      ? translations?.en?.[field.name]
      : body[field.name]
    if (value === undefined) errors[path] = ["Required"]
  }
  return errors
}

export function hasErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0
}

// Messages no field of the form shows: the body itself, a link list.
export function otherErrors(fields: Field[], errors: FieldErrors) {
  const shown = new Set(fields.map(fieldPath))
  return Object.entries(errors)
    .filter(([path]) => !shown.has(path))
    .flatMap(([path, messages]) =>
      messages.map((message) => (path ? `${path}: ${message}` : message))
    )
}
