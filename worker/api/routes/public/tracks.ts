import { Hono } from "hono"
import type { Track } from "@contracts/api/public"
import { methodNotAllowed } from "../../errors"
import type { PublicEnv } from "../../public"

type TrackRow = {
  id: number
  title: string
  artist: string
  source: string
  license: string
  r2_key: string
  duration_seconds: number
}

// Tracks are not translated; the Lang only keeps the path uniform.
export const tracks = new Hono<PublicEnv>()
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT id, title, artist, source, license, r2_key, duration_seconds
      FROM track ORDER BY position, id`
    ).all<TrackRow>()
    return c.json(
      results.map((row) => ({
        id: row.id,
        title: row.title,
        artist: row.artist,
        source: row.source,
        license: row.license,
        key: row.r2_key,
        durationSeconds: row.duration_seconds,
      })) satisfies Track[]
    )
  })
  .all("/", methodNotAllowed("GET, HEAD"))
