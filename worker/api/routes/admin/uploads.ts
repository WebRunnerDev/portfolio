import { Hono } from "hono"
import type { UploadResponse } from "@contracts/api/admin"
import { MAX_UPLOAD_BYTES, MEDIA_TYPES, mediaKind } from "@contracts/media"
import { sniffMedia } from "../../../media/sniff"
import type { AdminEnv } from "../../access"
import { apiError, methodNotAllowed } from "../../errors"

// POST /api/admin/uploads: the file is the raw body. Its type comes from its
// bytes (415 unless MEDIA_TYPES has it), its key from the type and a uuid.
const LARGEST = Math.max(...Object.values(MAX_UPLOAD_BYTES))

// Every column that holds an R2 key: a file one of them names stays.
// (D1 allows only a few terms in a compound SELECT, hence no UNION.)
const KEY_IN_USE = `
  SELECT EXISTS (SELECT 1 FROM profile WHERE photo_key = ?1)
    OR EXISTS (SELECT 1 FROM project WHERE cover_key = ?1)
    OR EXISTS (SELECT 1 FROM post WHERE cover_key = ?1)
    OR EXISTS (SELECT 1 FROM album WHERE cover_key = ?1)
    OR EXISTS (SELECT 1 FROM photo WHERE r2_key = ?1)
    OR EXISTS (SELECT 1 FROM track WHERE r2_key = ?1)
    OR EXISTS (SELECT 1 FROM cv_pdf WHERE r2_key = ?1) AS in_use`

const KEY = "/:key{.+}"

export const uploads = new Hono<AdminEnv>()
  .post("/", async (c) => {
    // Refuse a declared oversize body before reading it.
    if (Number(c.req.header("Content-Length")) > LARGEST) {
      return apiError(c, 413, "payload_too_large")
    }
    const bytes = new Uint8Array(await c.req.arrayBuffer())
    if (bytes.length === 0) return apiError(c, 400, "invalid_request")
    const media = sniffMedia(bytes)
    if (!media) return apiError(c, 415, "unsupported_media_type")
    const kind = mediaKind(media.type)
    if (bytes.length > MAX_UPLOAD_BYTES[kind]) {
      return apiError(c, 413, "payload_too_large")
    }

    const key = `${kind}/${crypto.randomUUID()}.${MEDIA_TYPES[media.type]}`
    await c.env.MEDIA.put(key, bytes, {
      httpMetadata: { contentType: media.type },
    })
    return c.json(
      {
        key,
        contentType: media.type,
        size: bytes.length,
        width: media.width ?? null,
        height: media.height ?? null,
      } satisfies UploadResponse,
      201
    )
  })
  .all("/", methodNotAllowed("POST"))
  // 409 while a row still points at the file.
  .delete(KEY, async (c) => {
    const key = c.req.param("key")
    const inUse = await c.env.DB.prepare(KEY_IN_USE).bind(key).first("in_use")
    if (inUse === 1) return apiError(c, 409, "conflict")
    if (!(await c.env.MEDIA.head(key))) return apiError(c, 404, "not_found")
    await c.env.MEDIA.delete(key)
    return c.body(null, 204)
  })
  .all(KEY, methodNotAllowed("DELETE"))
