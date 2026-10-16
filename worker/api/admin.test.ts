// Runs in workerd (the `worker` project in vite.config.ts) against the local
// D1. Requests go through the dev bypass (localhost + ACCESS_DEV_EMAIL);
// access.test.ts covers the Access JWT itself.
import { env, exports } from "cloudflare:workers"
import * as v from "valibot"
import { beforeAll, describe, expect, it } from "vitest"
import {
  AlbumAdmin,
  CertificationAdmin,
  CvSectionAdmin,
  EducationAdmin,
  ExperienceAdmin,
  LanguageSkillAdmin,
  PhotoAdmin,
  PostAdmin,
  ProfileAdmin,
  ProjectAdmin,
  TagAdmin,
  TechnologyAdmin,
  TrackAdmin,
} from "@contracts/api/admin"
import { ValidationErrorSchema } from "@contracts/api/errors"
import { api } from "."
import { create, type Entity } from "./admin-store"
import { MAX_JSON_BYTES } from "./body-limit"

const adminEnv = { ...env, ACCESS_DEV_EMAIL: "owner@example.com" }

type Body = Record<string, unknown>

function call(method: string, path: string, body?: unknown) {
  return api.request(
    `http://localhost/api/admin${path}`,
    {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body:
        body === undefined
          ? undefined
          : typeof body === "string"
            ? body
            : JSON.stringify(body),
    },
    adminEnv
  )
}

async function json(response: Response, status: number) {
  expect(response.status).toBe(status)
  return (await response.json()) as Body
}

// A 422 and its fields.
async function invalid(response: Response) {
  const body = v.parse(ValidationErrorSchema, await json(response, 422))
  return body.fields
}

async function expectError(response: Response, status: number, code: string) {
  expect(await json(response, status)).toEqual({ error: code })
}

// Rows other entities point at.
beforeAll(async () => {
  await env.DB.batch(
    [
      `INSERT INTO technology (id, name, category) VALUES
        (900, 'React', 'frontend'), (901, 'Hono', 'backend_cloud')`,
      `INSERT INTO tag (id, slug, name) VALUES (900, 'react', 'React'), (901, 'd1', 'D1')`,
      `INSERT INTO album (id, slug) VALUES (900, 'base')`,
      `INSERT INTO album_translation (album_id, lang, title) VALUES (900, 'en', 'Base')`,
    ].map((sql) => env.DB.prepare(sql))
  )
})

type Case = {
  path: string
  table: string
  schemas: { entity: v.GenericSchema }
  create: Body
  patch: Body
  // Translations: EN goes into `create.translations`; this one is PUT on RU.
  translation?: Body
}

const CASES: Case[] = [
  {
    path: "/cv-sections",
    table: "cv_section",
    schemas: CvSectionAdmin,
    create: { type: "experience" },
    patch: { showPdf: false },
  },
  {
    path: "/technologies",
    table: "technology",
    schemas: TechnologyAdmin,
    create: { name: "TypeScript", category: "frontend" },
    patch: { icon: "typescript", category: "tools_design" },
  },
  {
    path: "/experience",
    table: "experience",
    schemas: ExperienceAdmin,
    create: {
      startMonth: "2024-01",
      technologyIds: [901, 900],
      translations: {
        en: { company: "Acme", role: "Developer", bullets: ["Built it"] },
      },
    },
    patch: { endMonth: "2025-06", technologyIds: [900] },
    translation: { company: "Акме", role: "Разработчик", bullets: ["Сделал"] },
  },
  {
    path: "/education",
    table: "education",
    schemas: EducationAdmin,
    create: {
      startMonth: "2019-09",
      gpa: "3.6 / 4.0",
      translations: { en: { institution: "NU", degree: "BSc" } },
    },
    patch: { endMonth: "2023-06" },
    translation: { institution: "НУ", degree: "Бакалавр" },
  },
  {
    path: "/certifications",
    table: "certification",
    schemas: CertificationAdmin,
    create: { name: "Cloud Developer", issuer: "Cloudflare" },
    patch: { credentialUrl: "https://example.com/cert" },
  },
  {
    path: "/languages",
    table: "language_skill",
    schemas: LanguageSkillAdmin,
    create: {
      code: "kk",
      translations: { en: { name: "Kazakh", level: "Native" } },
    },
    patch: { code: "ru" },
    translation: { name: "Казахский", level: "Родной" },
  },
  {
    path: "/projects",
    table: "project",
    schemas: ProjectAdmin,
    create: {
      slug: "alpha",
      featured: true,
      technologyIds: [900],
      translations: {
        en: { title: "Alpha", description: "First", caseStudy: "# Alpha" },
      },
    },
    patch: { status: "completed", inCv: true, demoUrl: "https://alpha.dev" },
    translation: { title: "Альфа", description: "Первый", cvBullets: ["Да"] },
  },
  {
    path: "/posts",
    table: "post",
    schemas: PostAdmin,
    create: {
      slug: "hello",
      tagIds: [900],
      translations: { en: { title: "Hello", body: "# Hi" } },
    },
    patch: { slug: "hello-world", tagIds: [900, 901] },
    translation: { title: "Привет", readingMinutes: 3 },
  },
  {
    path: "/tags",
    table: "tag",
    schemas: TagAdmin,
    create: { slug: "cloudflare", name: "Cloudflare" },
    patch: { name: "CF" },
  },
  {
    path: "/albums",
    table: "album",
    schemas: AlbumAdmin,
    create: { slug: "trips", translations: { en: { title: "Trips" } } },
    patch: { coverKey: "photos/cover.jpg" },
    translation: { title: "Поездки" },
  },
  {
    path: "/photos",
    table: "photo",
    schemas: PhotoAdmin,
    create: {
      albumId: 900,
      r2Key: "photos/1.jpg",
      width: 1200,
      height: 800,
      translations: { en: { caption: "Mountains" } },
    },
    patch: { width: 1600 },
    translation: { caption: "Горы" },
  },
  {
    path: "/tracks",
    table: "track",
    schemas: TrackAdmin,
    create: {
      title: "Night Drive",
      artist: "Someone",
      source: "https://pixabay.com",
      license: "Pixabay",
      r2Key: "tracks/1.mp3",
      durationSeconds: 180,
    },
    patch: { durationSeconds: 181 },
  },
]

describe.each(CASES)("$path", (entry) => {
  const { path, schemas } = entry

  it("creates, reads, changes and deletes a record", async () => {
    const created = v.parse(
      schemas.entity,
      await json(await call("POST", path, entry.create), 201)
    ) as Body
    expect(created).toMatchObject(entry.create)
    const id = created.id as number

    expect(await json(await call("GET", `${path}/${id}`), 200)).toEqual(created)
    const all = await json(await call("GET", path), 200)
    expect(all).toContainEqual(created)

    const changed = await json(
      await call("PATCH", `${path}/${id}`, entry.patch),
      200
    )
    expect(v.parse(schemas.entity, changed)).toEqual({
      ...created,
      ...entry.patch,
    })

    expect((await call("DELETE", `${path}/${id}`)).status).toBe(204)
    await expectError(await call("GET", `${path}/${id}`), 404, "not_found")
    await expectError(await call("DELETE", `${path}/${id}`), 404, "not_found")
  })

  it.runIf(entry.translation)(
    "writes and removes a Translation on one Lang, then deletes them with the record",
    async () => {
      const { id } = await json(await call("POST", path, entry.create), 201)
      const translations = `${path}/${id}/translations`

      const withRu = await json(
        await call("PUT", `${translations}/ru`, entry.translation),
        200
      )
      const parsed = v.parse(schemas.entity, withRu) as Body
      expect(parsed.translations).toMatchObject({
        en: (entry.create.translations as Body).en,
        ru: entry.translation,
      })

      // PUT again replaces the whole Translation.
      const again = await json(
        await call("PUT", `${translations}/ru`, entry.translation),
        200
      )
      expect(again).toEqual(withRu)

      expect((await call("DELETE", `${translations}/ru`)).status).toBe(204)
      await expectError(
        await call("DELETE", `${translations}/ru`),
        404,
        "not_found"
      )
      const after = await json(await call("GET", `${path}/${id}`), 200)
      expect(Object.keys(after.translations as Body)).toEqual(["en"])

      expect((await call("DELETE", `${path}/${id}`)).status).toBe(204)
      const { n } = (await env.DB.prepare(
        `SELECT count(*) AS n FROM ${entry.table}_translation WHERE ${entry.table}_id = ?`
      )
        .bind(id)
        .first<{ n: number }>())!
      expect(n).toBe(0)
    }
  )

  it("rejects an invalid body with 422 and the fields", async () => {
    const fields = await invalid(
      await call("POST", path, {
        ...entry.create,
        id: "x",
        [Object.keys(entry.patch)[0]]: {},
      })
    )
    expect(Object.keys(fields)).toContain(Object.keys(entry.patch)[0])
    expect(await invalid(await call("POST", path, {}))).not.toEqual({})
  })
})

describe("validation", () => {
  it("requires EN when creating a translated entity", async () => {
    const fields = await invalid(
      await call("POST", "/albums", {
        slug: "no-en",
        translations: { ru: { title: "Только RU" } },
      })
    )
    expect(Object.keys(fields)).toEqual(["translations.en"])
  })

  it("points at nested fields by dot path", async () => {
    const fields = await invalid(
      await call("POST", "/experience", {
        startMonth: "2024-13",
        translations: { en: { company: "", role: "Dev", bullets: ["ok", ""] } },
      })
    )
    expect(Object.keys(fields).sort()).toEqual([
      "startMonth",
      "translations.en.bullets.1",
      "translations.en.company",
    ])
  })

  it("rejects an invalid PATCH and Translation with 422", async () => {
    const { id } = await json(
      await call("POST", "/albums", {
        slug: "patch-me",
        translations: { en: { title: "Patch me" } },
      }),
      201
    )
    expect(
      await invalid(
        await call("PATCH", `/albums/${id}`, { slug: "Not A Slug" })
      )
    ).toHaveProperty(["slug"])
    expect(
      await invalid(
        await call("PUT", `/albums/${id}/translations/ru`, { title: " " })
      )
    ).toHaveProperty(["title"])
  })

  it("answers a taken unique value with 422 on that field", async () => {
    const body = { slug: "taken", name: "Taken" }
    await json(await call("POST", "/tags", body), 201)
    expect(await invalid(await call("POST", "/tags", body))).toEqual({
      slug: ["Already taken"],
    })
    expect(
      await invalid(
        await call("POST", "/technologies", {
          name: "React",
          category: "frontend",
        })
      )
    ).toEqual({ name: ["Already taken"] })
  })

  it("answers links and refs to missing rows with 422", async () => {
    expect(
      await invalid(
        await call("POST", "/projects", {
          slug: "ghost",
          technologyIds: [900, 404],
          translations: { en: { title: "Ghost", description: "Boo" } },
        })
      )
    ).toEqual({ technologyIds: ["Unknown id: 404"] })
    expect(
      await invalid(
        await call("POST", "/photos", {
          albumId: 404,
          r2Key: "x.jpg",
          width: 1,
          height: 1,
        })
      )
    ).toEqual({ albumId: ["Unknown id: 404"] })
    const { n } = (await env.DB.prepare(
      "SELECT count(*) AS n FROM project WHERE slug = 'ghost'"
    ).first<{ n: number }>())!
    expect(n).toBe(0)
  })

  it("answers malformed JSON with 400", async () => {
    await expectError(await call("POST", "/tags", "{"), 400, "invalid_request")
  })

  it("answers an unknown Lang with 400 and a non-numeric id with 404", async () => {
    const { id } = await json(
      await call("POST", "/albums", {
        slug: "langs",
        translations: { en: { title: "L" } },
      }),
      201
    )
    await expectError(
      await call("PUT", `/albums/${id}/translations/fr`, { title: "Voyages" }),
      400,
      "invalid_request"
    )
    await expectError(await call("GET", "/albums/abc"), 404, "not_found")
  })

  it("rejects unknown fields with 422 rather than dropping them", async () => {
    const fields = await invalid(
      await call("POST", "/albums", {
        slug: "extra",
        position: 0,
        translations: { en: { title: "Extra", body: "x" }, fr: { title: "F" } },
      })
    )
    expect(Object.keys(fields).sort()).toEqual([
      "position",
      "translations.en.body",
      "translations.fr",
    ])
    const { id } = await json(
      await call("POST", "/tags", { slug: "strict", name: "Strict" }),
      201
    )
    expect(
      Object.keys(await invalid(await call("PATCH", `/tags/${id}`, { id: 1 })))
    ).toEqual(["id"])
  })

  it("refuses a JSON body over the limit with 413", async () => {
    const title = "x".repeat(MAX_JSON_BYTES)
    await expectError(
      await call("POST", "/albums", {
        slug: "huge",
        translations: { en: { title } },
      }),
      413,
      "payload_too_large"
    )
  })

  it("answers other methods with 405 and Allow", async () => {
    const response = await call("PUT", "/tags")
    expect(response.headers.get("Allow")).toBe("GET, HEAD, POST")
    await expectError(response, 405, "method_not_allowed")
  })
})

describe("Translations", () => {
  it("keeps EN, which every Lang falls back to", async () => {
    const { id } = await json(
      await call("POST", "/albums", {
        slug: "keep-en",
        translations: { en: { title: "Keep" } },
      }),
      201
    )
    await expectError(
      await call("DELETE", `/albums/${id}/translations/en`),
      409,
      "conflict"
    )
  })

  it("lets a photo have no caption at all", async () => {
    const photo = await json(
      await call("POST", "/photos", {
        albumId: 900,
        r2Key: "photos/bare.jpg",
        width: 10,
        height: 10,
      }),
      201
    )
    expect(photo.translations).toEqual({})
    await json(
      await call("PUT", `/photos/${photo.id}/translations/en`, {
        caption: "Hi",
      }),
      200
    )
    expect(
      (await call("DELETE", `/photos/${photo.id}/translations/en`)).status
    ).toBe(204)
  })

  it("writes a record with its Translations atomically", async () => {
    const album: Entity = {
      table: "album",
      fields: ["slug", "coverKey"],
      translation: { fields: ["title"], enRequired: true },
      ordered: true,
    }
    // `fr` breaks the CHECK on `lang` after the album row is inserted.
    await expect(
      create(env.DB, album, {
        slug: "half-written",
        coverKey: null,
        translations: { en: { title: "Half" }, fr: { title: "Moitié" } },
      })
    ).rejects.toThrow()
    const row = await env.DB.prepare(
      "SELECT id FROM album WHERE slug = 'half-written'"
    ).first()
    expect(row).toBeNull()
  })
})

describe("posts", () => {
  it("lists drafts, newest first", async () => {
    const draft = await json(
      await call("POST", "/posts", {
        slug: "draft-one",
        translations: { en: { title: "Draft" } },
      }),
      201
    )
    expect(draft).toMatchObject({ status: "draft", publishedAt: null })
    const list = (await json(
      await call("GET", "/posts"),
      200
    )) as unknown as Body[]
    expect(list[0].id).toBe(draft.id)
  })

  it("dates the first publish and keeps the date afterwards", async () => {
    const { id } = await json(
      await call("POST", "/posts", {
        slug: "publish-me",
        translations: { en: { title: "P" } },
      }),
      201
    )
    const published = await json(
      await call("PATCH", `/posts/${id}`, { status: "published" }),
      200
    )
    expect(published.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const draft = await json(
      await call("PATCH", `/posts/${id}`, { status: "draft" }),
      200
    )
    expect(draft.publishedAt).toBe(published.publishedAt)
    const again = await json(
      await call("PATCH", `/posts/${id}`, { status: "published" }),
      200
    )
    expect(again.publishedAt).toBe(published.publishedAt)
  })

  it("keeps a given publish date", async () => {
    const publishedAt = "2026-01-01T00:00:00.000Z"
    const post = await json(
      await call("POST", "/posts", {
        slug: "dated",
        status: "published",
        publishedAt,
        translations: { en: { title: "Dated" } },
      }),
      201
    )
    expect(post.publishedAt).toBe(publishedAt)
  })
})

describe("order", () => {
  it("sets positions from the ids and lists by them", async () => {
    const ids: number[] = []
    for (const title of ["One", "Two", "Three"]) {
      const track = await json(
        await call("POST", "/tracks", {
          title,
          artist: "A",
          source: "S",
          license: "L",
          r2Key: `tracks/${title}.mp3`,
          durationSeconds: 60,
        }),
        201
      )
      ids.push(track.id as number)
    }
    const order = (list: Body[]) =>
      list.map((row) => row.id).filter((id) => ids.includes(id as number))

    expect(
      order(
        (await json(await call("GET", "/tracks"), 200)) as unknown as Body[]
      )
    ).toEqual(ids)
    const reversed = [...ids].reverse()
    expect((await call("PUT", "/tracks/order", { ids: reversed })).status).toBe(
      204
    )
    expect(
      order(
        (await json(await call("GET", "/tracks"), 200)) as unknown as Body[]
      )
    ).toEqual(reversed)
  })

  it("rejects unknown ids and leaves the order alone", async () => {
    expect(
      await invalid(await call("PUT", "/albums/order", { ids: [900, 404] }))
    ).toEqual({
      ids: ["Unknown id: 404"],
    })
    expect(
      await invalid(await call("PUT", "/albums/order", { ids: [] }))
    ).toHaveProperty(["ids"])
  })

  it("puts a new photo last in its album and lists one album", async () => {
    const { id: albumId } = await json(
      await call("POST", "/albums", {
        slug: "ordered",
        translations: { en: { title: "O" } },
      }),
      201
    )
    const first = await json(
      await call("POST", "/photos", {
        albumId,
        r2Key: "o/1.jpg",
        width: 1,
        height: 1,
      }),
      201
    )
    const second = await json(
      await call("POST", "/photos", {
        albumId,
        r2Key: "o/2.jpg",
        width: 1,
        height: 1,
      }),
      201
    )
    const list = (await json(
      await call("GET", `/photos?albumId=${albumId}`),
      200
    )) as unknown as Body[]
    expect(list.map((row) => row.id)).toEqual([first.id, second.id])
    await expectError(
      await call("GET", "/photos?albumId=x"),
      400,
      "invalid_request"
    )
  })

  it("is only there for ordered entities", async () => {
    await expectError(
      await call("PUT", "/tags/order", { ids: [900] }),
      404,
      "not_found"
    )
  })
})

describe("deleting", () => {
  it("refuses an album that still has photos", async () => {
    const { id: albumId } = await json(
      await call("POST", "/albums", {
        slug: "full",
        translations: { en: { title: "Full" } },
      }),
      201
    )
    const photo = await json(
      await call("POST", "/photos", {
        albumId,
        r2Key: "full/1.jpg",
        width: 1,
        height: 1,
      }),
      201
    )
    await expectError(
      await call("DELETE", `/albums/${albumId}`),
      409,
      "conflict"
    )
    expect((await call("DELETE", `/photos/${photo.id}`)).status).toBe(204)
    expect((await call("DELETE", `/albums/${albumId}`)).status).toBe(204)
  })

  it("drops links to a deleted technology", async () => {
    const { id: techId } = await json(
      await call("POST", "/technologies", {
        name: "Gone",
        category: "tools_design",
      }),
      201
    )
    const project = await json(
      await call("POST", "/projects", {
        slug: "linked",
        technologyIds: [techId, 900],
        translations: { en: { title: "Linked", description: "L" } },
      }),
      201
    )
    expect(project.technologyIds).toEqual([techId, 900])
    expect((await call("DELETE", `/technologies/${techId}`)).status).toBe(204)
    const after = await json(await call("GET", `/projects/${project.id}`), 200)
    expect(after.technologyIds).toEqual([900])
  })
})

describe("/profile", () => {
  it("is created by PUT, then changed field by field", async () => {
    await expectError(await call("GET", "/profile"), 404, "not_found")
    await expectError(
      await call("PATCH", "/profile", { email: "a@b.co" }),
      404,
      "not_found"
    )

    const created = await json(
      await call("PUT", "/profile", {
        email: "me@example.com",
        translations: { en: { name: "Aibyn", headline: "Developer" } },
      }),
      200
    )
    expect(v.parse(ProfileAdmin.entity, created)).toMatchObject({
      id: 1,
      email: "me@example.com",
      githubUrl: null,
      translations: {
        en: { name: "Aibyn", headline: "Developer", about: null },
      },
    })

    await json(
      await call("PUT", "/profile/translations/ru", {
        name: "Айбын",
        headline: "Разработчик",
      }),
      200
    )
    // PUT again keeps the Translations it doesn't mention.
    const replaced = await json(
      await call("PUT", "/profile", {
        githubUrl: "https://github.com/me",
        translations: { en: { name: "Aibyn", headline: "Engineer" } },
      }),
      200
    )
    expect(replaced).toMatchObject({
      email: null,
      githubUrl: "https://github.com/me",
      translations: { en: { headline: "Engineer" }, ru: { name: "Айбын" } },
    })

    const patched = await json(
      await call("PATCH", "/profile", { email: "new@example.com" }),
      200
    )
    expect(patched).toMatchObject({
      email: "new@example.com",
      githubUrl: "https://github.com/me",
    })

    await expectError(
      await call("DELETE", "/profile/translations/en"),
      409,
      "conflict"
    )
    expect((await call("DELETE", "/profile/translations/ru")).status).toBe(204)
    await expectError(
      await call("DELETE", "/profile"),
      405,
      "method_not_allowed"
    )
  })

  it("rejects an invalid Profile with 422", async () => {
    const fields = await invalid(
      await call("PUT", "/profile", {
        email: "nope",
        translations: { en: { name: "A" } },
      })
    )
    expect(Object.keys(fields).sort()).toEqual([
      "email",
      "translations.en.headline",
    ])
  })
})

describe("without Access", () => {
  const paths = [
    "/profile",
    ...CASES.map((entry) => entry.path),
    "/projects/1",
    "/albums/1/translations/en",
    "/tracks/order",
  ]

  it.each(paths)("answers %s with 401", async (path) => {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      const response = await exports.default.fetch(
        `https://webrunner.dev/api/admin${path}`,
        { method }
      )
      await expectError(response, 401, "unauthorized")
    }
  })
})
