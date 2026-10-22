// Runs in workerd against the local D1; /{lang}/rss.xml through the whole
// Worker.
import { env, exports } from "cloudflare:workers"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { PUBLIC_CACHE_CONTROL } from "../api/public"
import { FEED_SIZE, rssFeed, rssLang } from "./serve"

// Edge has RU, Old is EN only (the Fallback on RU), Secret is a RU draft.
const SEED = `
INSERT INTO tag (id, slug, name) VALUES (1, 'cloudflare', 'Cloudflare'), (2, 'r-and-d', 'R&D');
INSERT INTO post (id, slug, status, published_at) VALUES
  (1, 'edge', 'published', '2026-10-20T12:00:00.000Z'),
  (2, 'old', 'published', '2026-01-15T08:30:00.000Z'),
  (3, 'secret', 'draft', NULL);
INSERT INTO post_translation (post_id, lang, title, excerpt, body, reading_minutes) VALUES
  (1, 'en', 'Edge caching', 'What a Worker keeps.', 'Body', 5),
  (1, 'ru', 'Кэш на краю', 'Что хранит Worker.', 'Тело', 5),
  (2, 'en', 'Old one', '', 'Body', 1),
  (3, 'en', 'Secret', 'Draft', 'Body', 1),
  (3, 'ru', 'Секрет', 'Черновик', 'Тело', 1);
INSERT INTO post_tag (post_id, tag_id) VALUES (1, 1), (1, 2), (3, 1);
`

beforeEach(async () => {
  const statements = SEED.split(";\n").filter((sql) => sql.trim())
  await env.DB.batch(statements.map((sql) => env.DB.prepare(sql)))
})

afterEach(async () => {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM post`),
    env.DB.prepare(`DELETE FROM tag`),
  ])
})

function feed(path: string, init?: RequestInit) {
  return exports.default.fetch(`https://webrunner.dev${path}`, init)
}

const all = (xml: string, name: string) =>
  [...xml.matchAll(new RegExp(`<${name}>([^<]*)</${name}>`, "g"))].map(
    (m) => m[1]
  )

describe("rssLang", () => {
  it("takes /{lang}/rss.xml only", () => {
    expect(rssLang("/kk/rss.xml")).toBe("kk")
    for (const path of ["/fr/rss.xml", "/rss.xml", "/en/blog/rss.xml"]) {
      expect(rssLang(path)).toBeUndefined()
    }
  })
})

describe("/{lang}/rss.xml", () => {
  it("answers RSS with the public cache", async () => {
    const response = await feed("/en/rss.xml")
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe(
      "application/rss+xml; charset=utf-8"
    )
    expect(response.headers.get("Cache-Control")).toBe(PUBLIC_CACHE_CONTROL)
    const xml = await response.text()
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss /)
    expect(xml).toContain(
      '<atom:link href="https://webrunner.dev/en/rss.xml" rel="self" type="application/rss+xml"/>'
    )
  })

  it("lists every published Post on EN, newest first, without drafts", async () => {
    const xml = await (await feed("/en/rss.xml")).text()
    expect(all(xml, "title")).toEqual([
      "Blog · WebRunner",
      "Edge caching",
      "Old one",
    ])
    expect(xml).toContain(
      '<guid isPermaLink="true">https://webrunner.dev/en/blog/edge</guid>'
    )
    expect(all(xml, "pubDate")).toEqual([
      "Tue, 20 Oct 2026 12:00:00 GMT",
      "Thu, 15 Jan 2026 08:30:00 GMT",
    ])
    expect(xml).not.toContain("Secret")
  })

  it("leaves out the Fallback: only Posts translated on the Lang", async () => {
    const xml = await (await feed("/ru/rss.xml")).text()
    expect(all(xml, "title")).toEqual(["Блог · WebRunner", "Кэш на краю"])
    expect(all(xml, "link")).toEqual([
      "https://webrunner.dev/ru/blog",
      "https://webrunner.dev/ru/blog/edge",
    ])
    expect(all(xml, "description")).toEqual([
      "Записи о веб-разработке.",
      "Что хранит Worker.",
    ])
    expect(all(xml, "category")).toEqual(["Cloudflare", "R&amp;D"])
    expect(all(xml, "language")).toEqual(["ru"])
    expect(xml).not.toContain("Old one")
    expect(xml).not.toContain("Секрет")
  })

  it("is an empty channel on a Lang with no Posts", async () => {
    const xml = await (await feed("/kk/rss.xml")).text()
    expect(all(xml, "title")).toEqual(["Блог · WebRunner"])
    expect(xml).not.toContain("<item>")
  })

  it(`carries the newest ${FEED_SIZE}`, async () => {
    await env.DB.batch(
      Array.from({ length: FEED_SIZE + 5 }, (_, i) => {
        const id = 100 + i
        const day = String(i + 1).padStart(2, "0")
        return [
          env.DB.prepare(
            `INSERT INTO post (id, slug, status, published_at)
            VALUES (?1, ?2, 'published', ?3)`
          ).bind(id, `p${id}`, `2025-12-${day}T00:00:00.000Z`),
          env.DB.prepare(
            `INSERT INTO post_translation
              (post_id, lang, title, excerpt, body, reading_minutes)
            VALUES (?1, 'de', ?2, '', '', 1)`
          ).bind(id, `P${id}`),
        ]
      }).flat()
    )
    const titles = all(await (await feed("/de/rss.xml")).text(), "title")
    expect(titles).toHaveLength(1 + FEED_SIZE)
    expect(titles[1]).toBe(`P${100 + FEED_SIZE + 4}`)
  })

  it("answers HEAD without a body, other methods 405", async () => {
    const head = await feed("/en/rss.xml", { method: "HEAD" })
    expect(head.status).toBe(200)
    expect(await head.text()).toBe("")
    const post = await feed("/en/rss.xml", { method: "POST" })
    expect(post.status).toBe(405)
    expect(post.headers.get("Allow")).toBe("GET, HEAD")
  })
})

describe("rssFeed", () => {
  it("escapes the text so it can't break the XML", () => {
    const xml = rssFeed("https://webrunner.dev", "en", [
      {
        id: 1,
        fallback: false,
        slug: "a b",
        title: `</title><x a="1">'&\u0001`,
        excerpt: "<![CDATA[ ]]>",
        readingMinutes: 1,
        coverKey: null,
        publishedAt: "2026-10-20T12:00:00.000Z",
        tags: [{ slug: "t", name: "<b>" }],
      },
    ])
    expect(xml).toContain(
      "<title>&lt;/title&gt;&lt;x a=&quot;1&quot;&gt;&apos;&amp;</title>"
    )
    expect(xml).toContain("<description>&lt;![CDATA[ ]]&gt;</description>")
    expect(xml).toContain("<category>&lt;b&gt;</category>")
    expect(xml).toContain("<link>https://webrunner.dev/en/blog/a%20b</link>")
  })
})
