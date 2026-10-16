import * as v from "valibot"
import {
  AdminMeResponseSchema,
  UploadResponseSchema,
} from "@contracts/api/admin"
import {
  ApiErrorSchema,
  ValidationErrorSchema,
  type ApiErrorCode,
} from "@contracts/api/errors"

// Client of /api/admin/* (worker/README.md › Admin API). Every call either
// answers with the parsed body or throws an AdminApiError.

// A row as the admin API answers it: the fields of the entity schema, `id`
// and, for a translated entity, `translations` by Lang.
export type AdminRow = { id: number } & Record<string, unknown>

export type Values = Record<string, unknown>

// `network_error`: no answer at all. Behind Access an expired session ends up
// here too: the login redirect is cross-origin, so fetch can't follow it.
// `bad_response`: the answer doesn't match the schema in contracts/.
export type AdminErrorCode = ApiErrorCode | "network_error" | "bad_response"

export class AdminApiError extends Error {
  readonly status: number
  readonly code: AdminErrorCode
  // 422: messages by dot path (`translations.en.title`).
  readonly fields: Record<string, string[]>

  constructor(
    status: number,
    code: AdminErrorCode,
    fields: Record<string, string[]> = {}
  ) {
    super(code)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

const BASE = "/api/admin"

async function request(path: string, init: RequestInit = {}) {
  let response: Response
  try {
    response = await fetch(BASE + path, init)
  } catch {
    throw new AdminApiError(0, "network_error")
  }
  if (response.status === 204) return undefined
  const body: unknown = await response.json().catch(() => undefined)
  if (response.ok) return body

  const validation = v.safeParse(ValidationErrorSchema, body)
  if (validation.success) {
    throw new AdminApiError(422, "validation_failed", validation.output.fields)
  }
  const error = v.safeParse(ApiErrorSchema, body)
  throw new AdminApiError(
    response.status,
    error.success ? error.output.error : "bad_response"
  )
}

function parsed<S extends v.GenericSchema>(schema: S, body: unknown) {
  const result = v.safeParse(schema, body)
  if (!result.success) {
    console.error("Unexpected admin API answer", result.issues)
    throw new AdminApiError(200, "bad_response")
  }
  return result.output as v.InferOutput<S>
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }
}

export async function getMe() {
  return parsed(AdminMeResponseSchema, await request("/me"))
}

// `rowSchema` is the entity schema of contracts/api/admin.ts.
export async function listRows(
  path: string,
  rowSchema: v.GenericSchema,
  query?: Record<string, string>
): Promise<AdminRow[]> {
  const search = query ? `?${new URLSearchParams(query)}` : ""
  return parsed(
    v.array(rowSchema),
    await request(`/${path}${search}`)
  ) as AdminRow[]
}

export async function getRow(
  path: string,
  rowSchema: v.GenericSchema
): Promise<AdminRow> {
  return parsed(rowSchema, await request(`/${path}`)) as AdminRow
}

// POST /<entity>, or PUT for the single Profile.
export async function createRow(
  path: string,
  rowSchema: v.GenericSchema,
  body: Values,
  method: "POST" | "PUT" = "POST"
): Promise<AdminRow> {
  return parsed(
    rowSchema,
    await request(`/${path}`, json(method, body))
  ) as AdminRow
}

export async function deleteRow(path: string, id: number) {
  await request(`/${path}/${id}`, { method: "DELETE" })
}

export async function reorderRows(path: string, ids: number[]) {
  await request(`/${path}/order`, json("PUT", { ids }))
}

// The raw file as the body; the Worker sniffs its type.
export async function uploadFile(file: File) {
  return parsed(
    UploadResponseSchema,
    await request("/uploads", { method: "POST", body: file })
  )
}

export async function deleteUpload(key: string) {
  const path = key.split("/").map(encodeURIComponent).join("/")
  await request(`/uploads/${path}`, { method: "DELETE" })
}
