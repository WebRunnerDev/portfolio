// Runs in workerd against the local D1; /sitemap.xml through the whole Worker.
import { env, exports } from "cloudflare:workers"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { LANGS } from "@contracts/lang"
import { PUBLIC_CACHE_CONTROL } from "../api/public"
import { serveSitemap } from "./serve"

// Projects: PlotOps has a Case Study on EN only, RU without one (no RU page);
// AMS has none (no page). Albums: Trips is EN, Old is RU only (no page on
// the other Langs). Posts: Edge on EN and RU, Draft never.
const SEED = `
INSERT INTO project (id, slug, position, updated_at) VALUES
  (1, 'plot ops', 0, '2026-11-01T10:00:00.000Z'),
  (2, 'ams', 1, '2026-11-02T10:00:00.000Z');
INSERT INTO project_translation (project_id, lang, title, description, case_study) VALUES
  (1, 'en', 'PlotOps', 'Field operations', '# Case'),
  (1, 'ru', 'PlotOps', 'Полевые работы', NULL),
  (2, 'en', 'AMS', 'Attendance', NULL);
INSERT INTO album (id, slug, position, created_at) VALUES
  (1, 'trips', 0, '2026-09-01T00:00:00.000Z'),
  (2, 'old', 1, '2026-08-01T00:00:00.000Z');
INSERT INTO album_translation (album_id, lang, title) VALUES
  (1, 'en', 'Trips'),
  (2, 'ru', 'Старое');
INSERT INTO photo (id, album_id, r2_key, width, height, created_at) VALUES
  (1, 1, 'image/a.jpg', 10, 10, '2026-10-05T00:00:00.000Z');
INSERT INTO post (id, slug, status, published_at, updated_at) VALUES
  (1, 'edge', 'published', '2026-10-20T12:00:00.000Z', '2026-10-21T08:00:00.000Z'),
  (2, 'draft', 'draft', NULL, '2026-10-22T08:00:00.000Z');
INSERT INTO post_translation (post_id, lang, title) VALUES
  (1, 'en', 'Edge'),
  (1, 'ru', 'Край'),
  (2, 'en', 'Draft');
`

beforeEach(async () => {
  const statements = SEED.split(";\n").filter((sql) => sql.trim())
  await env.DB.batch(statements.map((sql) => env.DB.prepare(sql)))
})

afterEach(async () => {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM project`),
    env.DB.prepare(`DELETE FROM photo`),
    env.DB.prepare(`DELETE FROM album`),
    env.DB.prepare(`DELETE FROM post`),
  ])
})

function visit(url = "https://webrunner.dev/sitemap.xml", init?: RequestInit) {
  return exports.default.fetch(url, init)
}

// Each <url> as its loc, lastmod and hreflang → href.
function urls(xml: string) {
  return [...xml.matchAll(/<url>(.*?)<\/url>/g)].map(([, body]) => ({
    loc: /<loc>([^<]*)<\/loc>/.exec(body)?.[1],
    lastmod: /<lastmod>([^<]*)<\/lastmod>/.exec(body)?.[1],
    alternates: Object.fromEntries(
      [...body.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(
        ([, lang, href]) => [lang, href]
      )
    ),
  }))
}

const locs = (xml: string) => urls(xml).map((url) => url.loc)

describe("/sitemap.xml", () => {
  it("answers XML with the public cache", async () => {
    const response = await visit()
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe(
      "application/xml; charset=utf-8"
    )
    expect(response.headers.get("Cache-Control")).toBe(PUBLIC_CACHE_CONTROL)
    expect(response.headers.has("X-Robots-Tag")).toBe(false)
    const xml = await response.text()
    expect(xml).toMatch(
      /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9" xmlns:xhtml="http:\/\/www.w3.org\/1999\/xhtml">/
    )
  })

  it("lists every section on every Lang, with hreflang and x-default", async () => {
    const all = urls(await (await visit()).text())
    for (const path of ["", "/cv", "/projects", "/gallery", "/blog"]) {
      for (const lang of LANGS) {
        const url = all.find(
          (u) => u.loc === `https://webrunner.dev/${lang}${path}`
        )
        expect(url, `${lang}${path}`).toBeDefined()
        expect(url!.lastmod).toBeUndefined()
        expect(Object.keys(url!.alternates)).toEqual([...LANGS, "x-default"])
        expect(url!.alternates["x-default"]).toBe(
          `https://webrunner.dev/en${path}`
        )
      }
    }
  })

  it("leaves out pages kept out of search", async () => {
    const xml = await (await visit()).text()
    expect(xml).not.toContain("/design")
    expect(xml).not.toContain("/cv/print")
    expect(xml).not.toContain("draft")
  })

  it("lists a Project's page on the Langs it has a Case Study on", async () => {
    const all = urls(await (await visit()).text())
    const plotOps = all.filter((u) => u.loc?.includes("/projects/plot%20ops"))
    // RU has its own Translation without a Case Study; the others take EN's.
    expect(plotOps.map((u) => u.loc)).toEqual(
      LANGS.filter((lang) => lang !== "ru").map(
        (lang) => `https://webrunner.dev/${lang}/projects/plot%20ops`
      )
    )
    expect(plotOps[0].lastmod).toBe("2026-11-01T10:00:00.000Z")
    expect(plotOps[0].alternates).not.toHaveProperty("ru")
    expect(all.some((u) => u.loc?.includes("/projects/ams"))).toBe(false)
  })

  it("dates an Album by its newest photo, on the Langs it answers on", async () => {
    const all = urls(await (await visit()).text())
    const trips = all.filter((u) => u.loc?.endsWith("/gallery/trips"))
    expect(trips).toHaveLength(LANGS.length)
    expect(trips[0].lastmod).toBe("2026-10-05T00:00:00.000Z")
    const old = all.filter((u) => u.loc?.endsWith("/gallery/old"))
    expect(old.map((u) => u.loc)).toEqual([
      "https://webrunner.dev/ru/gallery/old",
    ])
    expect(old[0].lastmod).toBe("2026-08-01T00:00:00.000Z")
    expect(old[0].alternates).toEqual({
      ru: "https://webrunner.dev/ru/gallery/old",
    })
  })

  it("lists a Post on the Langs it is translated on, no Fallback", async () => {
    const all = urls(await (await visit()).text())
    const edge = all.filter((u) => u.loc?.endsWith("/blog/edge"))
    expect(edge.map((u) => u.loc)).toEqual([
      "https://webrunner.dev/en/blog/edge",
      "https://webrunner.dev/ru/blog/edge",
    ])
    expect(edge[0].lastmod).toBe("2026-10-21T08:00:00.000Z")
    expect(edge[1].alternates).toEqual({
      en: "https://webrunner.dev/en/blog/edge",
      ru: "https://webrunner.dev/ru/blog/edge",
      "x-default": "https://webrunner.dev/en/blog/edge",
    })
  })

  it("uses the request's origin and keeps Previews noindex", async () => {
    const origin = "https://feature-webrunner.example.workers.dev"
    const response = await visit(`${origin}/sitemap.xml`)
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex")
    expect(locs(await response.text())[0]).toBe(`${origin}/en`)
  })

  it("answers 503 when D1 fails", async () => {
    const broken = {
      ...env,
      DB: {
        prepare: () => {
          throw new Error("no such table: project")
        },
      },
    } as unknown as Env
    const response = await serveSitemap(
      new Request("https://webrunner.dev/sitemap.xml"),
      broken
    )
    expect(response.status).toBe(503)
  })

  it("answers HEAD without a body and other methods with 405", async () => {
    const head = await visit(undefined, { method: "HEAD" })
    expect(head.status).toBe(200)
    expect(await head.text()).toBe("")
    const post = await visit(undefined, { method: "POST" })
    expect(post.status).toBe(405)
    expect(post.headers.get("Allow")).toBe("GET, HEAD")
  })
})
