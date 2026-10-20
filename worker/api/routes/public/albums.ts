import { Hono } from "hono"
import type { Album, AlbumDetail, Photo } from "@contracts/api/public"
import { apiError, methodNotAllowed } from "../../errors"
import { translationOf, type PublicEnv } from "../../public"

type AlbumRow = {
  id: number
  fallback: number
  slug: string
  title: string
  cover_key: string | null
}

// The cover chosen in the admin, else the first photo. Picked here rather
// than stored, so a new order or a deleted photo shows at once.
const SELECT_ALBUM = `SELECT a.id, t.lang <> ?1 AS fallback, a.slug, t.title,
    coalesce(a.cover_key, (
      SELECT r2_key FROM photo WHERE album_id = a.id
      ORDER BY position, id LIMIT 1
    )) AS cover_key
  FROM album a JOIN ${translationOf("album", "a")}`

function toAlbum(row: AlbumRow): Album {
  return {
    id: row.id,
    fallback: row.fallback === 1,
    slug: row.slug,
    title: row.title,
    coverKey: row.cover_key,
  }
}

type PhotoRow = {
  id: number
  fallback: number
  r2_key: string
  width: number
  height: number
  caption: string | null
}

export const albums = new Hono<PublicEnv>()
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `${SELECT_ALBUM} ORDER BY a.position, a.id`
    )
      .bind(c.var.lang)
      .all<AlbumRow>()
    return c.json(results.map(toAlbum) satisfies Album[])
  })
  .get("/:slug", async (c) => {
    const { lang } = c.var
    const album = await c.env.DB.prepare(`${SELECT_ALBUM} WHERE a.slug = ?2`)
      .bind(lang, c.req.param("slug"))
      .first<AlbumRow>()
    if (!album) return apiError(c, 404, "not_found")
    // The caption is optional, hence the left join: no caption on either Lang
    // is not a fallback.
    const { results } = await c.env.DB.prepare(
      `SELECT p.id, coalesce(t.lang <> ?1, 0) AS fallback, p.r2_key, p.width,
        p.height, t.caption
      FROM photo p LEFT JOIN ${translationOf("photo", "p")}
      WHERE p.album_id = ?2
      ORDER BY p.position, p.id`
    )
      .bind(lang, album.id)
      .all<PhotoRow>()
    return c.json({
      ...toAlbum(album),
      photos: results.map((row): Photo => ({
        id: row.id,
        fallback: row.fallback === 1,
        key: row.r2_key,
        width: row.width,
        height: row.height,
        caption: row.caption,
      })),
    } satisfies AlbumDetail)
  })
  .all("/", methodNotAllowed("GET, HEAD"))
  .all("/:slug", methodNotAllowed("GET, HEAD"))
