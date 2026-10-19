import { describe, expect, it } from "vitest"

import { LANGS } from "./lang"
import {
  PAGE_PATHS,
  alternates,
  cvMeta,
  notFoundMeta,
  pageMeta,
  parsePagePath,
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
})
