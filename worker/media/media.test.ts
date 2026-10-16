// Runs in workerd (the `worker` project in vite.config.ts) against the local
// R2 and D1. Uploads go through the dev bypass (localhost + ACCESS_DEV_EMAIL);
// /media/* through the whole Worker.
import { env, exports } from "cloudflare:workers"
import * as v from "valibot"
import { describe, expect, it } from "vitest"
import { UploadResponseSchema } from "@contracts/api/admin"
import { MAX_UPLOAD_BYTES } from "@contracts/media"
import { api } from "../api"
import * as files from "../test/media-fixtures"
import { parseRange } from "./serve"

const adminEnv = { ...env, ACCESS_DEV_EMAIL: "owner@example.com" }

function upload(body: BodyInit, headers: HeadersInit = {}) {
  return api.request(
    "http://localhost/api/admin/uploads",
    { method: "POST", body, headers },
    adminEnv
  )
}

function remove(key: string) {
  return api.request(
    `http://localhost/api/admin/uploads/${key}`,
    { method: "DELETE" },
    adminEnv
  )
}

function media(path: string, init?: RequestInit) {
  return exports.default.fetch(`https://webrunner.dev/media/${path}`, init)
}

async function uploaded(body: Uint8Array) {
  const response = await upload(body)
  expect(response.status).toBe(201)
  return v.parse(UploadResponseSchema, await response.json())
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  expect(await response.json()).toEqual({ error: code })
}

describe("POST /api/admin/uploads", () => {
  it("stores an image under a fresh key and answers its size", async () => {
    const body = await uploaded(files.png(800, 600))
    expect(body).toEqual({
      key: expect.stringMatching(/^image\/[0-9a-f-]{36}\.png$/),
      contentType: "image/png",
      size: files.png(800, 600).length,
      width: 800,
      height: 600,
    })
    const again = await uploaded(files.png(800, 600))
    expect(again.key).not.toBe(body.key)
  })

  it("answers null sizes for audio and PDFs", async () => {
    const audio = await uploaded(files.mp3WithId3())
    expect(audio).toMatchObject({ contentType: "audio/mpeg", width: null })
    expect(audio.key).toMatch(/^audio\/.+\.mp3$/)
    const pdf = await uploaded(files.pdf())
    expect(pdf).toMatchObject({ contentType: "application/pdf", height: null })
    expect(pdf.key).toMatch(/^pdf\/.+\.pdf$/)
  })

  it("goes by the bytes, not the declared Content-Type", async () => {
    const body = await uploaded(files.jpeg(30, 20))
    expect(body.contentType).toBe("image/jpeg")
    const disguised = await upload(files.svg(), { "Content-Type": "image/png" })
    await expectError(disguised, 415, "unsupported_media_type")
  })

  it("rejects other types with 415 and an empty body with 400", async () => {
    await expectError(await upload(files.gif()), 415, "unsupported_media_type")
    await expectError(await upload(new Uint8Array()), 400, "invalid_request")
  })

  it("rejects a file over its kind's limit with 413", async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES.pdf + 1)
    big.set(files.pdf())
    await expectError(await upload(big), 413, "payload_too_large")
  })

  it("needs Access and answers only POST", async () => {
    const response = await exports.default.fetch(
      "https://webrunner.dev/api/admin/uploads",
      { method: "POST", body: files.pdf() }
    )
    await expectError(response, 401, "unauthorized")
    const get = await api.request(
      "http://localhost/api/admin/uploads",
      {},
      adminEnv
    )
    expect(get.headers.get("Allow")).toBe("POST")
    await expectError(get, 405, "method_not_allowed")
  })
})

describe("GET /media/*", () => {
  it("serves an upload with its type, an ETag and a long cache", async () => {
    const file = files.png(10, 10)
    const { key } = await uploaded(file)
    const response = await media(key)
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("image/png")
    expect(response.headers.get("Content-Length")).toBe(String(file.length))
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable"
    )
    expect(response.headers.get("Accept-Ranges")).toBe("bytes")
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(response.headers.get("ETag")).toMatch(/^"\w+"$/)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(file)
  })

  it("answers 304 to a matching If-None-Match", async () => {
    const { key } = await uploaded(files.pdf())
    const etag = (await media(key)).headers.get("ETag")!
    const response = await media(key, { headers: { "If-None-Match": etag } })
    expect(response.status).toBe(304)
    expect(response.headers.get("ETag")).toBe(etag)
  })

  it("answers a Range with 206 and that slice", async () => {
    const file = files.counting(1000)
    file.set(files.mp3WithId3())
    const { key } = await uploaded(file)

    const middle = await media(key, { headers: { Range: "bytes=100-199" } })
    expect(middle.status).toBe(206)
    expect(middle.headers.get("Content-Type")).toBe("audio/mpeg")
    expect(middle.headers.get("Content-Range")).toBe("bytes 100-199/1000")
    expect(middle.headers.get("Content-Length")).toBe("100")
    expect(new Uint8Array(await middle.arrayBuffer())).toEqual(
      file.slice(100, 200)
    )

    const open = await media(key, { headers: { Range: "bytes=990-" } })
    expect(open.headers.get("Content-Range")).toBe("bytes 990-999/1000")
    expect(new Uint8Array(await open.arrayBuffer())).toEqual(file.slice(990))

    const suffix = await media(key, { headers: { Range: "bytes=-10" } })
    expect(suffix.status).toBe(206)
    expect(suffix.headers.get("Content-Range")).toBe("bytes 990-999/1000")
    expect(new Uint8Array(await suffix.arrayBuffer())).toEqual(file.slice(990))
  })

  it("answers 416 to a Range past the end", async () => {
    const { key } = await uploaded(files.ogg())
    const response = await media(key, { headers: { Range: "bytes=5000-" } })
    expect(response.status).toBe(416)
    expect(response.headers.get("Content-Range")).toBe(
      `bytes */${files.ogg().length}`
    )
  })

  it("serves the whole file when it ignores the Range", async () => {
    const { key, size } = await uploaded(files.ogg())
    const response = await media(key, { headers: { Range: "bytes=0-1,5-6" } })
    expect(response.status).toBe(200)
    expect((await response.arrayBuffer()).byteLength).toBe(size)
  })

  it("answers HEAD without a body", async () => {
    const { key, size } = await uploaded(files.pdf())
    const response = await media(key, { method: "HEAD" })
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("application/pdf")
    expect(await response.text()).toBe("")
    expect(size).toBe(files.pdf().length)
  })

  it("caches a key without a uuid briefly", async () => {
    await env.MEDIA.put("cv/en.pdf", files.pdf(), {
      httpMetadata: { contentType: "application/pdf" },
    })
    const response = await media("cv/en.pdf")
    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60")
  })

  it("answers 404 to a missing file and 405 to other methods", async () => {
    expect((await media("image/nothing.png")).status).toBe(404)
    expect((await media("")).status).toBe(404)
    expect((await media("%E0%A4%A")).status).toBe(404)
    const post = await media("image/nothing.png", { method: "POST" })
    expect(post.status).toBe(405)
    expect(post.headers.get("Allow")).toBe("GET, HEAD")
  })
})

describe("DELETE /api/admin/uploads/:key", () => {
  it("removes the file", async () => {
    const { key } = await uploaded(files.png(4, 4))
    expect((await remove(key)).status).toBe(204)
    expect((await media(key)).status).toBe(404)
    await expectError(await remove(key), 404, "not_found")
  })

  it("keeps a file a row still points at with 409", async () => {
    const { key, width, height } = await uploaded(files.jpeg(30, 20))
    await env.DB.batch([
      env.DB.prepare("INSERT INTO album (id, slug) VALUES (950, 'kept')"),
      env.DB.prepare(
        "INSERT INTO photo (album_id, r2_key, width, height) VALUES (950, ?, ?, ?)"
      ).bind(key, width, height),
    ])
    await expectError(await remove(key), 409, "conflict")
    expect((await media(key)).status).toBe(200)
  })
})

describe("parseRange", () => {
  it("clamps a single range to the file", () => {
    expect(parseRange("bytes=0-99", 1000)).toEqual({ offset: 0, length: 100 })
    expect(parseRange("bytes=900-", 1000)).toEqual({ offset: 900, length: 100 })
    expect(parseRange("bytes=900-5000", 1000)).toEqual({
      offset: 900,
      length: 100,
    })
    expect(parseRange("bytes=-100", 1000)).toEqual({
      offset: 900,
      length: 100,
    })
    expect(parseRange("bytes=-5000", 1000)).toEqual({ offset: 0, length: 1000 })
  })

  it("refuses a range that starts past the end", () => {
    expect(parseRange("bytes=1000-", 1000)).toBe("unsatisfiable")
    expect(parseRange("bytes=-0", 1000)).toBe("unsatisfiable")
  })

  it("ignores what it can't serve as one range", () => {
    for (const header of [
      null,
      "bytes=0-1,5-6",
      "bytes=-",
      "bytes=10-5",
      "items=0-5",
      "bytes=abc",
    ]) {
      expect(parseRange(header, 1000)).toBeNull()
    }
  })
})
