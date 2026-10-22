import { describe, expect, it } from "vitest"

import { LANGS } from "./lang"
import {
  PAGE_PATHS,
  albumMeta,
  alternates,
  blogPosting,
  cvMeta,
  jsonLd,
  notFoundMeta,
  pageMeta,
  parsePagePath,
  postMeta,
  projectMeta,
} from "./meta"
import { MESSAGES } from "./messages"

const SECTIONS = ["", "cv", "projects", "gallery", "blog"] as const

describe("pageMeta", () => {
  it("has every section and the design page", () => {
    expect(PAGE_PATHS).toEqual([...SECTIONS, "design"])
  })

  it.each(LANGS)("titles and describes every section in %s", (lang) => {
    for (const path of SECTIONS) {
      const meta = pageMeta(lang, path)
      const key = path || "home"
      expect(meta).toEqual({
        title: path
          ? `${MESSAGES[lang][`nav.${key}` as "nav.cv"]} · WebRunner`
          : "WebRunner",
        description: MESSAGES[lang][`meta.${key}` as "meta.cv"],
      })
    }
  })

  it("speaks the Lang", () => {
    expect(pageMeta("ru", "cv")?.title).toBe("Резюме · WebRunner")
    expect(pageMeta("de", "blog")?.title).toBe("Blog · WebRunner")
  })

  it("keeps the design page out of search", () => {
    expect(pageMeta("en", "design")?.noindex).toBe(true)
  })

  it("has no meta for an unknown path", () => {
    expect(pageMeta("en", "nope")).toBeNull()
    expect(notFoundMeta("ru")).toMatchObject({
      title: "Страница не найдена · WebRunner",
      noindex: true,
    })
  })
})

describe("cvMeta", () => {
  it("titles the CV with the Profile on the Lang", () => {
    expect(
      cvMeta("ru", { name: "Жасулан Абдигалиев", headline: "Веб-разработчик" })
    ).toEqual({
      title: "Жасулан Абдигалиев: Резюме · WebRunner",
      description:
        "Веб-разработчик. Опыт, технологии, образование и сертификаты.",
    })
  })

  it("keeps the section meta without a Profile", () => {
    expect(cvMeta("de", null)).toEqual(pageMeta("de", "cv"))
  })
})

describe("projectMeta", () => {
  const project = {
    title: "PlotOps",
    description: "Field operations",
    coverKey: "projects/plot ops.png",
    caseStudy: "# Case",
  }

  it("titles the page with the Project and its cover as OG image", () => {
    expect(projectMeta(project)).toEqual({
      title: "PlotOps · WebRunner",
      description: "Field operations",
      image:
        "/cdn-cgi/image/width=1200,fit=scale-down,format=auto/media/projects/plot%20ops.png",
    })
  })

  it("keeps the default OG image without a cover", () => {
    expect(projectMeta({ ...project, coverKey: null })).not.toHaveProperty(
      "image"
    )
  })

  it("is null without a Case Study or a Project", () => {
    expect(projectMeta({ ...project, caseStudy: null })).toBeNull()
    expect(projectMeta(null)).toBeNull()
  })
})

describe("parsePagePath", () => {
  it("splits the Lang from the path", () => {
    expect(parsePagePath("/ru")).toEqual({ lang: "ru", path: "" })
    expect(parsePagePath("/ru/")).toEqual({ lang: "ru", path: "" })
    expect(parsePagePath("/ru/cv/")).toEqual({ lang: "ru", path: "cv" })
    expect(parsePagePath("/ar/blog/a-post")).toEqual({
      lang: "ar",
      path: "blog/a-post",
    })
  })

  it("is null without a Lang", () => {
    expect(parsePagePath("/")).toBeNull()
    expect(parsePagePath("/admin")).toBeNull()
    expect(parsePagePath("/fr/cv")).toBeNull()
  })
})

describe("alternates", () => {
  it("links every Lang and x-default on EN", () => {
    expect(alternates("https://webrunner.dev", "cv")).toEqual([
      ...LANGS.map((lang) => ({
        hrefLang: lang,
        href: `https://webrunner.dev/${lang}/cv`,
      })),
      { hrefLang: "x-default", href: "https://webrunner.dev/en/cv" },
    ])
    expect(alternates("https://webrunner.dev", "")[1].href).toBe(
      "https://webrunner.dev/ru"
    )
  })

  it("links only the Langs given, x-default only with EN", () => {
    expect(alternates("https://webrunner.dev", "blog/x", ["ru", "en"])).toEqual(
      [
        { hrefLang: "en", href: "https://webrunner.dev/en/blog/x" },
        { hrefLang: "ru", href: "https://webrunner.dev/ru/blog/x" },
        { hrefLang: "x-default", href: "https://webrunner.dev/en/blog/x" },
      ]
    )
    expect(alternates("https://webrunner.dev", "blog/x", ["kk"])).toEqual([
      { hrefLang: "kk", href: "https://webrunner.dev/kk/blog/x" },
    ])
  })
})

describe("albumMeta", () => {
  const album = { title: "Trips", cover: { key: "photos/a b.jpg" } }

  it("titles the page with the Album and its cover as OG image", () => {
    expect(albumMeta("en", album)).toEqual({
      title: "Trips · WebRunner",
      description: "Photo album “Trips”.",
      image:
        "/cdn-cgi/image/width=1200,fit=scale-down,format=auto/media/photos/a%20b.jpg",
    })
    expect(albumMeta("ru", album)?.description).toBe("Фотоальбом «Trips».")
  })

  it("keeps the default OG image without photos", () => {
    expect(albumMeta("en", { ...album, cover: null })).not.toHaveProperty(
      "image"
    )
  })

  it("is null without an Album", () => {
    expect(albumMeta("en", null)).toBeNull()
  })
})

describe("postMeta", () => {
  const post = {
    fallback: false,
    title: "Edge caching",
    excerpt: "What a Worker keeps.",
    coverKey: "image/edge.jpg",
    publishedAt: "2026-10-20T12:00:00.000Z",
    updatedAt: "2026-10-21T08:00:00.000Z",
    langs: ["en", "ru"] as const,
  }

  it("titles the page with the Post, its excerpt and cover", () => {
    expect(postMeta("ru", post, "Aibyn")).toEqual({
      title: "Edge caching · WebRunner",
      description: "What a Worker keeps.",
      image:
        "/cdn-cgi/image/width=1200,fit=scale-down,format=auto/media/image/edge.jpg",
      langs: ["en", "ru"],
      article: {
        headline: "Edge caching",
        publishedTime: "2026-10-20T12:00:00.000Z",
        modifiedTime: "2026-10-21T08:00:00.000Z",
        lang: "ru",
        author: "Aibyn",
      },
    })
  })

  it("describes a post without an excerpt as the Blog", () => {
    const meta = postMeta("ru", { ...post, excerpt: "", coverKey: null }, null)
    expect(meta?.description).toBe(MESSAGES.ru["meta.blog"])
    expect(meta).not.toHaveProperty("image")
  })

  it("puts the text in EN on the Fallback", () => {
    const meta = postMeta("kk", { ...post, fallback: true }, null)
    expect(meta?.article?.lang).toBe("en")
  })

  it("is null without a Post", () => {
    expect(postMeta("en", null, null)).toBeNull()
  })
})

describe("blogPosting", () => {
  const meta = postMeta(
    "ru",
    {
      fallback: false,
      title: "Кэш",
      excerpt: "Что хранит Worker.",
      coverKey: null,
      publishedAt: "2026-10-20T12:00:00.000Z",
      updatedAt: "2026-10-21T08:00:00.000Z",
      langs: ["en", "ru"],
    },
    "Aibyn"
  )!

  it("describes a Post's page with absolute URLs", () => {
    expect(
      blogPosting("https://webrunner.dev", "ru", "blog/cache", meta)
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Кэш",
      description: "Что хранит Worker.",
      image: ["https://webrunner.dev/og-default.png"],
      datePublished: "2026-10-20T12:00:00.000Z",
      dateModified: "2026-10-21T08:00:00.000Z",
      author: {
        "@type": "Person",
        name: "Aibyn",
        url: "https://webrunner.dev/ru/cv",
      },
      inLanguage: "ru",
      url: "https://webrunner.dev/ru/blog/cache",
      mainEntityOfPage: "https://webrunner.dev/ru/blog/cache",
    })
  })

  it("leaves the author out before the Profile is filled in", () => {
    const posting = blogPosting("https://webrunner.dev", "ru", "blog/cache", {
      ...meta,
      article: { ...meta.article!, author: null },
    })
    expect(posting).not.toHaveProperty("author")
  })

  it("is null for a page that is not a Post", () => {
    expect(
      blogPosting("https://webrunner.dev", "ru", "cv", pageMeta("ru", "cv")!)
    ).toBeNull()
  })
})

describe("jsonLd", () => {
  it("escapes < so the text can't close the script", () => {
    const text = jsonLd({ headline: "</script><!-- x" })
    expect(text).not.toContain("<")
    expect(JSON.parse(text)).toEqual({ headline: "</script><!-- x" })
  })
})
