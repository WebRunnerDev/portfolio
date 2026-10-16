import * as v from "valibot"

import type { Values } from "../api/admin-api"
import type { EntityConfig, Field } from "../model/entities"

// The create form and the editor: raw input values by field name (text as
// typed, checkbox state, picked ids), turned into the bodies of
// contracts/api/admin.ts.
export type FormValue = string | boolean | number[]

export type FormValues = Record<string, FormValue>

// Messages by dot path, as the API's 422 `fields`.
export type FieldErrors = Record<string, string[]>

export function fieldPath(field: Field) {
  return field.translated ? `translations.en.${field.name}` : field.name
}

export function plainFields(entity: EntityConfig) {
  return entity.fields.filter((field) => !field.translated)
}

export function translatedFields(entity: EntityConfig) {
  return entity.fields.filter((field) => field.translated)
}

// `2026-10-16T09:30:00.000Z` as `<input type="datetime-local">` shows it.
function localDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

// A stored value as the field's input shows it; a missing one as the
// field's default.
function formValue(field: Field, raw: unknown): FormValue {
  switch (field.kind) {
    case "boolean":
      return typeof raw === "boolean" ? raw : field.initial
    case "select":
      return typeof raw === "string" ? raw : (field.initial ?? field.options[0])
    case "refs":
      return Array.isArray(raw)
        ? raw.filter((id) => typeof id === "number")
        : []
    case "lines":
      return Array.isArray(raw) ? raw.join("\n") : ""
    case "datetime":
      return typeof raw === "string" ? localDateTime(raw) : ""
    default:
      return raw === undefined || raw === null ? "" : String(raw)
  }
}

// `source`: a row, a Translation, or a preset of the create form.
export function initialValues(
  fields: Field[],
  source: Values = {}
): FormValues {
  return Object.fromEntries(
    fields.map((field) => [field.name, formValue(field, source[field.name])])
  )
}

// What an input sends; undefined when it's empty.
function inputValue(field: Field, raw: FormValue | undefined) {
  if (field.kind === "boolean") return raw === true
  if (field.kind === "refs") return Array.isArray(raw) ? raw : []
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
    case "datetime": {
      const date = new Date(raw)
      // A bad value goes as typed, for the schema to name it.
      return Number.isNaN(date.getTime()) ? raw : date.toISOString()
    }
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

// PATCH body of the editor: every untranslated field. An emptied optional
// field is null, so it's cleared instead of left as it was; an emptied
// required one is left out, for validatePatch to ask for it.
export function patchBody(entity: EntityConfig, values: FormValues): Values {
  const body: Values = {}
  for (const field of plainFields(entity)) {
    const value = inputValue(field, values[field.name])
    if (value !== undefined) body[field.name] = value
    else if (!isRequired(entity.schemas.create, field.name)) {
      body[field.name] = null
    }
  }
  return body
}

// PUT /translations/:lang body: the whole Translation. Empty inputs are left
// out, so they take the schema's default (null, "", []).
export function translationBody(
  entity: EntityConfig,
  values: FormValues
): Values {
  const body: Values = {}
  for (const field of translatedFields(entity)) {
    const value = inputValue(field, values[field.name])
    if (value !== undefined) body[field.name] = value
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
// value `required` names as missing, the schema's message for a bad one.
function check(
  schema: v.GenericSchema,
  body: Values,
  missing: string[]
): FieldErrors {
  const errors: FieldErrors = {}
  const result = v.safeParse(schema, body)
  if (!result.success) {
    const { root, nested } = v.flatten(result.issues)
    if (root) errors[""] = root
    for (const [path, messages] of Object.entries(nested ?? {})) {
      if (messages) errors[path] = messages
    }
  }
  for (const path of missing) errors[path] = ["Required"]
  return errors
}

export function validateBody(entity: EntityConfig, body: Values): FieldErrors {
  const translations = body.translations as Record<string, Values> | undefined
  const missing = entity.createFields
    .filter((field) => isRequired(entity.schemas.create, fieldPath(field)))
    .filter(
      (field) =>
        (field.translated
          ? translations?.en?.[field.name]
          : body[field.name]) === undefined
    )
    .map(fieldPath)
  return check(entity.schemas.create, body, missing)
}

// Errors of the editor are by field name: one form per Translation.
export function validatePatch(entity: EntityConfig, body: Values): FieldErrors {
  const missing = plainFields(entity)
    .map((field) => field.name)
    .filter((name) => body[name] === undefined)
  return check(entity.schemas.patch, body, missing)
}

export function validateTranslation(
  entity: EntityConfig,
  body: Values
): FieldErrors {
  const schema = entity.schemas.translation!
  const missing = translatedFields(entity)
    .map((field) => field.name)
    .filter((name) => isRequired(schema, name) && body[name] === undefined)
  return check(schema, body, missing)
}

export function hasErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0
}

// Messages no field of the form shows: the body itself, a link list.
export function otherErrors(
  fields: Field[],
  errors: FieldErrors,
  path: (field: Field) => string = fieldPath
) {
  const shown = new Set(fields.map(path))
  return Object.entries(errors)
    .filter(([key]) => !shown.has(key))
    .flatMap(([key, messages]) =>
      messages.map((message) => (key ? `${key}: ${message}` : message))
    )
}

function filled(value: FormValue | undefined) {
  if (typeof value === "string") return value.trim() !== ""
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined
}

// How much of a Translation is filled in: `filled` of `total` fields.
export function completeness(entity: EntityConfig, values: FormValues) {
  const fields = translatedFields(entity)
  return {
    filled: fields.filter((field) => filled(values[field.name])).length,
    total: fields.length,
  }
}

export function sameValues(a: FormValues, b: FormValues) {
  return Object.keys({ ...a, ...b }).every(
    (name) => JSON.stringify(a[name]) === JSON.stringify(b[name])
  )
}
