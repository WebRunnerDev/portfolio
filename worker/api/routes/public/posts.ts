import { sValidator } from "@hono/standard-validator"
import { Hono } from "hono"
import {
  PostsQuerySchema,
  type Post,
  type PostDetail,
  type Tag,
} from "@contracts/api/public"
import type { Lang } from "@contracts/lang"
import { apiError, methodNotAllowed, rejectInvalid } from "../../errors"
import { parseJson, translationOf, type PublicEnv } from "../../public"

type PostRow = {
  id: number
  fallback: number
  slug: string
  title: string
  excerpt: string
  reading_minutes: number
  cover_key: string | null
  published_at: string
  tags: string
  body: string
  updated_at: string
  langs: string
}

// Drafts never leave the Worker.
const SELECT_POST = `SELECT p.id, t.lang <> ?1 AS fallback, p.slug, t.title,
    t.excerpt, t.reading_minutes, p.cover_key, p.published_at, t.body,
    p.updated_at, (
      SELECT json_group_array(lang) FROM post_translation
      WHERE post_id = p.id
    ) AS langs,
    (
      SELECT json_group_array(json_object('slug', slug, 'name', name))
      FROM (
        SELECT tag.slug, tag.name FROM post_tag
        JOIN tag ON tag.id = post_tag.tag_id
        WHERE post_tag.post_id = p.id
        ORDER BY tag.name
      )
    ) AS tags
  FROM post p JOIN ${translationOf("post", "p")}
  WHERE p.status = 'published'`

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    fallback: row.fallback === 1,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    readingMinutes: row.reading_minutes,
    coverKey: row.cover_key,
    publishedAt: row.published_at,
    tags: parseJson<Tag[]>(row.tags),
  }
}

// The published Post at `slug` on a Lang, with its body; null for an unknown
// slug and a draft. Meta Injection of its page reads it too.
export async function readPost(
  db: D1Database,
  lang: Lang,
  slug: string
): Promise<PostDetail | null> {
  const row = await db
    .prepare(`${SELECT_POST} AND p.slug = ?2`)
    .bind(lang, slug)
    .first<PostRow>()
  if (!row) return null
  return {
    ...toPost(row),
    body: row.body,
    updatedAt: row.updated_at,
    langs: parseJson<Lang[]>(row.langs),
  }
}

// Newest first, without the body; `?tag=<slug>` keeps the posts with that Tag.
export const posts = new Hono<PublicEnv>()
  .get("/", sValidator("query", PostsQuerySchema, rejectInvalid), async (c) => {
    const { tag } = c.req.valid("query")
    const byTag = `AND EXISTS (
      SELECT 1 FROM post_tag JOIN tag ON tag.id = post_tag.tag_id
      WHERE post_tag.post_id = p.id AND tag.slug = ?2
    )`
    const statement = c.env.DB.prepare(
      `${SELECT_POST} ${tag ? byTag : ""} ORDER BY p.published_at DESC, p.id DESC`
    )
    const { results } = await (
      tag ? statement.bind(c.var.lang, tag) : statement.bind(c.var.lang)
    ).all<PostRow>()
    return c.json(results.map(toPost) satisfies Post[])
  })
  .get("/:slug", async (c) => {
    const post = await readPost(c.env.DB, c.var.lang, c.req.param("slug"))
    if (!post) return apiError(c, 404, "not_found")
    return c.json(post satisfies PostDetail)
  })
  .all("/", methodNotAllowed("GET, HEAD"))
  .all("/:slug", methodNotAllowed("GET, HEAD"))
