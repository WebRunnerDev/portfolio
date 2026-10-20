import { Hono } from "hono"
import type { UploadResponse } from "@contracts/api/admin"
import { MAX_UPLOAD_BYTES, MEDIA_TYPES, mediaKind } from "@contracts/media"
import { sniffMedia } from "../../../media/sniff"
import type { AdminEnv } from "../../access"
import { apiError, methodNotAllowed } from "../../errors"
import { keyInUse } from "../../media-keys"

// POST /api/admin/uploads: the file is the raw body. Its type comes from its
// bytes (415 unless MEDIA_TYPES has it), its key from the type and a uuid.
// `limitBody` (body-limit.ts) has already refused a body over the largest
// kind's limit.

const KEY = "/:key{.+}"

export const uploads = new Hono<AdminEnv>()
  .post("/", async (c) => {
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
    if (await keyInUse(c.env.DB, key)) return apiError(c, 409, "conflict")
    if (!(await c.env.MEDIA.head(key))) return apiError(c, 404, "not_found")
    await c.env.MEDIA.delete(key)
    return c.body(null, 204)
  })
  .all(KEY, methodNotAllowed("DELETE"))
