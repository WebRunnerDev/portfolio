// GET /media/<key>: a file from the MEDIA bucket (worker/README.md › Media),
// with ETag revalidation and byte ranges (seeking in audio).

// Uploads get a fresh uuid in their key, so the bytes behind it never change.
const IMMUTABLE_KEY =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

const PREFIX = "/media/"

function status(code: number, headers?: HeadersInit) {
  return new Response(null, { status: code, headers })
}

function keyOf(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.slice(PREFIX.length))
  } catch {
    return ""
  }
}

type ByteRange = { offset: number; length: number }

// The one range of a `Range: bytes=…` header, clamped to the file. null
// serves the whole file: no header, a malformed one or several ranges, which
// RFC 9110 lets a server ignore. Parsed here rather than by R2, which locally
// ignores what production refuses.
export function parseRange(
  header: string | null,
  size: number
): ByteRange | null | "unsatisfiable" {
  const match = header && /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (!match[1] && !match[2])) return null
  const [, first, last] = match
  // `bytes=-500`: the last 500 bytes.
  if (!first) {
    const length = Math.min(Number(last), size)
    return length > 0 ? { offset: size - length, length } : "unsatisfiable"
  }
  const offset = Number(first)
  if (offset >= size) return "unsatisfiable"
  const end = last ? Math.min(Number(last), size - 1) : size - 1
  return end < offset ? null : { offset, length: end - offset + 1 }
}

function unsatisfiable(size: number) {
  return status(416, { "Content-Range": `bytes */${size}` })
}

export async function serveMedia(request: Request, env: Env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return status(405, { Allow: "GET, HEAD" })
  }
  const key = keyOf(request.url)
  if (!key) return status(404)

  // A range needs the size first.
  let range: ByteRange | null = null
  if (request.headers.has("Range")) {
    const head = await env.MEDIA.head(key)
    if (!head) return status(404)
    const parsed = parseRange(request.headers.get("Range"), head.size)
    if (parsed === "unsatisfiable") return unsatisfiable(head.size)
    range = parsed
  }

  const object = await env.MEDIA.get(key, {
    onlyIf: request.headers,
    ...(range && { range }),
  })
  if (!object) return status(404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set("ETag", object.httpEtag)
  headers.set("Accept-Ranges", "bytes")
  headers.set(
    "Cache-Control",
    IMMUTABLE_KEY.test(key)
      ? "public, max-age=31536000, immutable"
      : "public, max-age=60"
  )
  headers.set("X-Content-Type-Options", "nosniff")

  // A condition failed: the client's copy is current (If-None-Match,
  // If-Modified-Since) or stale (If-Match, If-Unmodified-Since).
  if (!("body" in object)) {
    const current =
      request.headers.has("If-None-Match") ||
      request.headers.has("If-Modified-Since")
    return status(current ? 304 : 412, headers)
  }

  let code = 200
  let length = object.size
  if (range) {
    code = 206
    length = range.length
    headers.set(
      "Content-Range",
      `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`
    )
  }
  headers.set("Content-Length", String(length))

  if (request.method === "HEAD") {
    await object.body.cancel()
    return status(code, headers)
  }
  return new Response(object.body, { status: code, headers })
}
