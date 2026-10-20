// Runs in workerd. ASSETS is a stand-in serving a minimal index.html, since
// the test project has no build output.
import { env } from "cloudflare:workers"
import { describe, expect, it } from "vitest"
import { LANGS } from "@contracts/lang"
import { PAGE_PATHS, pageMeta } from "@contracts/meta"
import { resolveMeta, type DataPage } from "./pages"
import { headTags, servePage } from "./serve-page"

const INDEX_HTML = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title data-meta>WebRunner</title></head><body><div id="root"></div></body></html>`

const assetRequests: Request[] = []

const testEnv = {
  ...env,
  ASSETS: {
    async fetch(input: RequestInfo | URL, init?: RequestInit) {
      const request = new Request(input, init)
      assetRequests.push(request)
      return new Response(request.method === "HEAD" ? null : INDEX_HTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ETag: '"index"',
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      })
    },
  },
} as unknown as Env

async function page(url: string, init?: RequestInit) {
  const response = await servePage(new Request(url, init), testEnv)
  if (!response) throw new Error(`no page for ${url}`)
  const html = await response.text()
  const doc = {
    html,
    attr: (selector: RegExp) => selector.exec(html)?.[1],
    all: (selector: RegExp) => [...html.matchAll(selector)].map((m) => m[1]),
  }
  return { response, ...doc }
}

const content = (name: string) =>
  new RegExp(`<meta data-meta (?:name|property)="${name}" content="([^"]*)"`)

describe("servePage", () => {
  it("leaves paths without a Lang alone", async () => {
    for (const path of ["/", "/admin", "/fr/cv", "/favicon.svg"]) {
      expect(
        await servePage(new Request(`https://webrunner.dev${path}`), testEnv)
      ).toBeNull()
    }
  })

  it.each(LANGS)("injects the meta of every page in %s", async (lang) => {
    for (const path of PAGE_PATHS) {
      const url = `https://webrunner.dev/${lang}${path ? `/${path}` : ""}`
      const meta = pageMeta(lang, path)!
      const { response, attr, all } = await page(url)

      expect(response.status).toBe(200)
      expect(attr(/<html lang="([^"]+)"/)).toBe(lang)
      expect(attr(/<html lang="[^"]+" dir="([^"]+)"/)).toBe(
        lang === "ar" ? "rtl" : "ltr"
      )
      expect(attr(/<title data-meta>([^<]*)</)).toBe(meta.title)
      expect(attr(content("description"))).toBe(meta.description)
      expect(attr(content("og:title"))).toBe(meta.title)
      expect(attr(content("og:description"))).toBe(meta.description)
      expect(attr(content("og:url"))).toBe(url)
      expect(attr(content("og:image"))).toBe(
        "https://webrunner.dev/og-default.png"
      )
      expect(attr(content("twitter:card"))).toBe("summary_large_image")
      expect(attr(/rel="canonical" href="([^"]+)"/)).toBe(url)
      expect(all(/rel="alternate" hreflang="([^"]+)"/g)).toEqual([
        ...LANGS,
        "x-default",
      ])
      expect(attr(content("robots"))).toBe(meta.noindex ? "noindex" : undefined)
    }
  })

  it("serves /ru/cv in Russian", async () => {
    const { html, attr } = await page("https://webrunner.dev/ru/cv")
    expect(attr(/<title data-meta>([^<]*)</)).toBe("Резюме · WebRunner")
    expect(attr(content("og:locale"))).toBe("ru_RU")
    expect(html).toContain(
      '<link data-meta rel="alternate" hreflang="x-default" href="https://webrunner.dev/en/cv">'
    )
  })

  it("titles the CV from the Profile on the Lang, EN where it has none", async () => {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO profile (id) VALUES (1)`),
      env.DB.prepare(
        `INSERT INTO profile_translation (profile_id, lang, name, headline)
        VALUES (1, 'en', 'Zhasulan Abdigaliyev', 'Frontend developer'),
          (1, 'ru', 'Жасулан Абдигалиев', 'Фронтенд-разработчик')`
      ),
    ])
    try {
      const ru = await page("https://webrunner.dev/ru/cv")
      expect(ru.attr(/<title data-meta>([^<]*)</)).toBe(
        "Жасулан Абдигалиев: Резюме · WebRunner"
      )
      expect(ru.attr(content("description"))).toBe(
        "Фронтенд-разработчик. Опыт, технологии, образование и сертификаты."
      )
      const de = await page("https://webrunner.dev/de/cv")
      expect(de.attr(/<title data-meta>([^<]*)</)).toBe(
        "Zhasulan Abdigaliyev: Lebenslauf · WebRunner"
      )
    } finally {
      await env.DB.batch([
        env.DB.prepare(`DELETE FROM profile_translation`),
        env.DB.prepare(`DELETE FROM profile`),
      ])
    }
  })

  it("titles a Project's page from the Project on the Lang, EN where it has none", async () => {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO project (id, slug, cover_key)
        VALUES (1, 'plotops', 'projects/plotops.png'), (2, 'ams', NULL),
          (3, 'old', NULL)`
      ),
      env.DB.prepare(
        `INSERT INTO project_translation
          (project_id, lang, title, description, case_study)
        VALUES (1, 'en', 'PlotOps', 'Field operations', '# Case'),
          (1, 'ru', 'ПлотОпс', 'Полевые работы', '# Кейс'),
          (2, 'en', 'AITU AMS', 'Attendance management', '# Case'),
          (3, 'en', 'Old one', 'Long ago', NULL)`
      ),
    ])
    try {
      const ru = await page("https://webrunner.dev/ru/projects/plotops")
      expect(ru.response.status).toBe(200)
      expect(ru.attr(/<title data-meta>([^<]*)</)).toBe("ПлотОпс · WebRunner")
      expect(ru.attr(content("og:title"))).toBe("ПлотОпс · WebRunner")
      expect(ru.attr(content("description"))).toBe("Полевые работы")
      expect(ru.attr(content("og:image"))).toBe(
        "https://webrunner.dev/cdn-cgi/image/width=1200,fit=scale-down,format=auto/media/projects/plotops.png"
      )
      expect(ru.attr(/rel="canonical" href="([^"]+)"/)).toBe(
        "https://webrunner.dev/ru/projects/plotops"
      )
      expect(ru.attr(content("robots"))).toBeUndefined()

      // No RU Translation: EN; no cover: the default OG image.
      const ams = await page("https://webrunner.dev/ru/projects/ams")
      expect(ams.response.status).toBe(200)
      expect(ams.attr(/<title data-meta>([^<]*)</)).toBe("AITU AMS · WebRunner")
      expect(ams.attr(content("og:image"))).toBe(
        "https://webrunner.dev/og-default.png"
      )

      // No Case Study, an unknown or a broken slug: 404.
      for (const slug of ["old", "nope", "%E0"]) {
        const { response, attr } = await page(
          `https://webrunner.dev/ru/projects/${slug}`
        )
        expect(response.status).toBe(404)
        expect(attr(content("robots"))).toBe("noindex")
      }
    } finally {
      await env.DB.batch([
        env.DB.prepare(`DELETE FROM project_translation`),
        env.DB.prepare(`DELETE FROM project`),
      ])
    }
  })

  it("keeps a Project's page when D1 fails", async () => {
    const broken = {
      ...testEnv,
      DB: {
        prepare: () => {
          throw new Error("no such table: project")
        },
      },
    } as unknown as Env
    expect(await resolveMeta(broken, "ru", "projects/plotops")).toEqual(
      pageMeta("ru", "projects")
    )
  })

  it("serves the Print CV with noindex", async () => {
    const { response, attr } = await page("https://webrunner.dev/en/cv/print")
    expect(response.status).toBe(200)
    expect(attr(/<title data-meta>([^<]*)</)).toBe("CV · WebRunner")
    expect(attr(content("robots"))).toBe("noindex")
  })

  it("keeps the CV section meta when D1 fails", async () => {
    const broken = {
      ...testEnv,
      DB: {
        prepare: () => {
          throw new Error("no such table: profile")
        },
      },
    } as unknown as Env
    expect(await resolveMeta(broken, "ru", "cv")).toEqual(pageMeta("ru", "cv"))
  })

  it("canonicalizes a trailing slash", async () => {
    const { attr } = await page("https://webrunner.dev/de/blog/")
    expect(attr(/rel="canonical" href="([^"]+)"/)).toBe(
      "https://webrunner.dev/de/blog"
    )
  })

  it("answers an unknown path with 404 and the same SPA", async () => {
    const { response, html, attr } = await page("https://webrunner.dev/de/nope")
    expect(response.status).toBe(404)
    expect(html).toContain('<div id="root">')
    expect(attr(/<title data-meta>([^<]*)</)).toBe(
      "Seite nicht gefunden · WebRunner"
    )
    expect(attr(content("robots"))).toBe("noindex")
  })

  it("keeps Preview URLs noindex", async () => {
    const { response, attr } = await page(
      "https://feat-x-webrunner.example.workers.dev/en/cv"
    )
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex")
    expect(attr(content("robots"))).toBe("noindex")
    expect(attr(/rel="canonical" href="([^"]+)"/)).toBe(
      "https://feat-x-webrunner.example.workers.dev/en/cv"
    )
  })

  it("fetches index.html without the client's conditions and drops its ETag", async () => {
    assetRequests.length = 0
    const { response } = await page("https://webrunner.dev/en/cv", {
      headers: { "If-None-Match": '"index"' },
    })
    expect(new URL(assetRequests[0].url).pathname).toBe("/")
    expect(assetRequests[0].headers.has("If-None-Match")).toBe(false)
    expect(response.headers.has("ETag")).toBe(false)
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, must-revalidate"
    )
  })

  it("escapes values in attributes", () => {
    const tags = headTags(
      new URL("https://webrunner.dev/en/blog/x"),
      "en",
      "blog/x",
      { title: 'A "post"', description: "<script>&" },
      false
    )
    expect(tags).toContain('content="A &quot;post&quot;"')
    expect(tags).toContain('content="&lt;script&gt;&amp;"')
  })
})

describe("resolveMeta", () => {
  const post: DataPage = {
    pattern: /^blog\/([^/]+)$/,
    meta: async (_env, lang, [, slug]) =>
      slug === "hello"
        ? {
            title: `Hello (${lang})`,
            description: "A post",
            image: "/media/c.png",
          }
        : null,
  }

  it("takes meta from a data page, null for an unknown slug", async () => {
    expect(
      await resolveMeta(testEnv, "ru", "blog/hello", [post])
    ).toMatchObject({ title: "Hello (ru)" })
    expect(await resolveMeta(testEnv, "ru", "blog/nope", [post])).toBeNull()
    expect(await resolveMeta(testEnv, "ru", "blog", [post])).toEqual(
      pageMeta("ru", "blog")
    )
  })
})
