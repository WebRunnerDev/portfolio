// Runs in workerd (the `worker` project in vite.config.ts) against the local
// D1, seeded below: most entities have EN and RU Translations, some only EN,
// so `de` shows the Fallback.
import { env, exports } from "cloudflare:workers"
import * as v from "valibot"
import { beforeAll, describe, expect, it } from "vitest"
import {
  AlbumDetailSchema,
  AlbumSchema,
  CertificationSchema,
  CvSectionSchema,
  EducationSchema,
  ExperienceSchema,
  LanguageSkillSchema,
  PostDetailSchema,
  PostSchema,
  ProfileSchema,
  ProjectDetailSchema,
  ProjectSchema,
  TechnologySchema,
  TrackSchema,
} from "@contracts/api/public"
import { PUBLIC_CACHE_CONTROL } from "./public"

const SEED = `
INSERT INTO profile (id, email, github_url) VALUES (1, 'me@example.com', 'https://github.com/me');
INSERT INTO profile_translation (profile_id, lang, name, headline) VALUES
  (1, 'en', 'Aibyn', 'Frontend developer'),
  (1, 'ru', 'Айбын', 'Фронтенд-разработчик');

INSERT INTO cv_section (type, position, show_web, show_pdf) VALUES
  ('experience', 1, 1, 1), ('projects', 2, 0, 1), ('technologies', 0, 1, 0);

INSERT INTO technology (id, name, category, position) VALUES
  (1, 'React', 'frontend', 0), (2, 'Hono', 'backend_cloud', 0);

INSERT INTO experience (id, start_month, end_month, position) VALUES
  (1, '2024-01', NULL, 0), (2, '2022-03', '2023-12', 1), (3, '2021-01', '2021-06', 2);
INSERT INTO experience_translation (experience_id, lang, company, role, bullets) VALUES
  (1, 'en', 'Acme', 'Developer', '["Built things"]'),
  (1, 'ru', 'Акме', 'Разработчик', '["Делал штуки"]'),
  (2, 'en', 'Globex', 'Intern', '[]'),
  (3, 'ru', 'Только RU', 'Стажёр', '[]');
INSERT INTO experience_technology (experience_id, technology_id, position) VALUES
  (1, 2, 0), (1, 1, 1);

INSERT INTO education (id, start_month, gpa) VALUES (1, '2019-09', '3.6 / 4.0');
INSERT INTO education_translation (education_id, lang, institution, degree) VALUES
  (1, 'en', 'Nazarbayev University', 'BSc Computer Science'),
  (1, 'ru', 'Назарбаев Университет', 'Бакалавр информатики');

INSERT INTO certification (id, name, issuer, issued_month) VALUES
  (1, 'Cloud Developer', 'Cloudflare', '2025-05');

INSERT INTO language_skill (id, code) VALUES (1, 'kk'), (2, 'en');
INSERT INTO language_skill_translation (language_skill_id, lang, name, level) VALUES
  (1, 'en', 'Kazakh', 'Native'),
  (1, 'ru', 'Казахский', 'Родной'),
  (2, 'en', 'English', 'C1');

INSERT INTO project (id, slug, status, featured, in_cv, position) VALUES
  (1, 'alpha', 'completed', 1, 1, 0), (2, 'beta', 'in_progress', 0, 0, 1);
INSERT INTO project_translation (project_id, lang, title, description, cv_bullets, case_study) VALUES
  (1, 'en', 'Alpha', 'First project', '["Shipped"]', '# Alpha'),
  (1, 'ru', 'Альфа', 'Первый проект', '["Запустил"]', '# Альфа'),
  (2, 'en', 'Beta', 'Second project', '[]', NULL);
INSERT INTO project_technology (project_id, technology_id, position) VALUES (1, 1, 0);

INSERT INTO tag (id, slug, name) VALUES (1, 'cloudflare', 'Cloudflare'), (2, 'react', 'React');
INSERT INTO post (id, slug, status, published_at) VALUES
  (1, 'hello', 'published', '2026-01-01T00:00:00.000Z'),
  (2, 'second', 'published', '2026-02-01T00:00:00.000Z'),
  (3, 'secret', 'draft', NULL);
INSERT INTO post_translation (post_id, lang, title, excerpt, body, reading_minutes) VALUES
  (1, 'en', 'Hello', 'Hi', 'Hello body', 2),
  (1, 'ru', 'Привет', 'Хай', 'Тело', 2),
  (2, 'en', 'Second', 'Two', 'Second body', 3),
  (3, 'en', 'Secret', 'Draft', 'Draft body', 1);
INSERT INTO post_tag (post_id, tag_id) VALUES (1, 1), (2, 2), (3, 1);

INSERT INTO album (id, slug, position) VALUES (1, 'trips', 0), (2, 'cats', 1);
INSERT INTO album_translation (album_id, lang, title) VALUES
  (1, 'en', 'Trips'), (1, 'ru', 'Поездки'), (2, 'en', 'Cats');
INSERT INTO photo (id, album_id, r2_key, width, height, position) VALUES
  (1, 1, 'photos/1.jpg', 1200, 800, 0),
  (2, 1, 'photos/2.jpg', 800, 1200, 1),
  (3, 1, 'photos/3.jpg', 1000, 1000, 2),
  (4, 2, 'photos/4.jpg', 1000, 1000, 0);
INSERT INTO photo_translation (photo_id, lang, caption) VALUES
  (1, 'en', 'Mountains'), (1, 'ru', 'Горы'), (2, 'en', 'Lake');

INSERT INTO track (id, title, artist, source, license, r2_key, duration_seconds) VALUES
  (1, 'Night Drive', 'Someone', 'https://example.com', 'CC BY 4.0', 'tracks/1.mp3', 180);
`

beforeAll(async () => {
  const statements = SEED.split(";\n").filter((sql) => sql.trim())
  await env.DB.batch(statements.map((sql) => env.DB.prepare(sql)))
})

function request(path: string, init?: RequestInit) {
  return exports.default.fetch(`https://webrunner.dev/api/public${path}`, init)
}

// GET that must answer 200 with the public cache header; parsed by `schema`.
async function get<T extends v.GenericSchema>(path: string, schema: T) {
  const response = await request(path)
  expect(response.status).toBe(200)
  expect(response.headers.get("Cache-Control")).toBe(PUBLIC_CACHE_CONTROL)
  return v.parse(schema, await response.json())
}

async function expectError(path: string, status: number, code: string) {
  const response = await request(path)
  expect(response.status).toBe(status)
  expect(response.headers.get("Cache-Control")).toBeNull()
  expect(await response.json()).toEqual({ error: code })
}

describe("Lang", () => {
  it("answers 400 for an unknown Lang", async () => {
    await expectError("/fr/profile", 400, "invalid_request")
    await expectError("/EN/profile", 400, "invalid_request")
    await expectError("/fr/nope", 400, "invalid_request")
  })

  it("answers 404 for an unknown path under a Lang", async () => {
    await expectError("/en/nope", 404, "not_found")
  })

  it("rejects other methods with 405", async () => {
    const response = await request("/en/projects", { method: "POST" })
    expect(response.status).toBe(405)
    expect(response.headers.get("Allow")).toBe("GET, HEAD")
  })
})

describe("profile", () => {
  it("answers on a Lang with a Translation", async () => {
    expect(await get("/ru/profile", ProfileSchema)).toEqual({
      fallback: false,
      name: "Айбын",
      headline: "Фронтенд-разработчик",
      about: null,
      location: null,
      email: "me@example.com",
      telegramUrl: null,
      linkedinUrl: null,
      githubUrl: "https://github.com/me",
      photoKey: null,
    })
  })

  it("falls back to EN", async () => {
    const profile = await get("/de/profile", ProfileSchema)
    expect(profile).toMatchObject({ fallback: true, name: "Aibyn" })
  })

  it("is not a fallback on EN itself", async () => {
    const profile = await get("/en/profile", ProfileSchema)
    expect(profile).toMatchObject({ fallback: false, name: "Aibyn" })
  })
})

describe("cv-sections", () => {
  it("lists the sections shown on the Web CV, in order", async () => {
    const sections = await get("/kk/cv-sections", v.array(CvSectionSchema))
    expect(sections).toEqual([{ type: "technologies" }, { type: "experience" }])
  })

  it("lists the sections shown on the Print CV with ?form=print", async () => {
    const sections = await get(
      "/kk/cv-sections?form=print",
      v.array(CvSectionSchema)
    )
    expect(sections).toEqual([{ type: "experience" }, { type: "projects" }])
  })

  it("answers 400 to an unknown form", async () => {
    await expectError("/en/cv-sections?form=pdf", 400, "invalid_request")
  })
})

describe("experience", () => {
  it("answers on a Lang with a Translation, with technologies in order", async () => {
    const [first, second, third] = await get(
      "/ru/experience",
      v.array(ExperienceSchema)
    )
    expect(first).toEqual({
      id: 1,
      fallback: false,
      company: "Акме",
      companyUrl: null,
      role: "Разработчик",
      location: null,
      startMonth: "2024-01",
      endMonth: null,
      bullets: ["Делал штуки"],
      technologies: [
        { id: 2, name: "Hono", category: "backend_cloud", icon: null },
        { id: 1, name: "React", category: "frontend", icon: null },
      ],
    })
    expect(second).toMatchObject({ id: 2, fallback: true, company: "Globex" })
    expect(third).toMatchObject({ id: 3, fallback: false, technologies: [] })
  })

  it("falls back to EN and drops entries translated on neither", async () => {
    const list = await get("/de/experience", v.array(ExperienceSchema))
    expect(list.map((e) => [e.id, e.fallback, e.company])).toEqual([
      [1, true, "Acme"],
      [2, true, "Globex"],
    ])
  })
})

describe("education", () => {
  it("answers on a Lang with a Translation", async () => {
    const [entry] = await get("/ru/education", v.array(EducationSchema))
    expect(entry).toEqual({
      id: 1,
      fallback: false,
      institution: "Назарбаев Университет",
      degree: "Бакалавр информатики",
      diploma: null,
      gpa: "3.6 / 4.0",
      startMonth: "2019-09",
      endMonth: null,
    })
  })

  it("falls back to EN", async () => {
    const [entry] = await get("/ar/education", v.array(EducationSchema))
    expect(entry).toMatchObject({
      fallback: true,
      degree: "BSc Computer Science",
    })
  })
})

describe("certifications", () => {
  it("is the same on every Lang", async () => {
    const expected = [
      {
        id: 1,
        name: "Cloud Developer",
        issuer: "Cloudflare",
        issuedMonth: "2025-05",
        credentialUrl: null,
      },
    ]
    const schema = v.array(CertificationSchema)
    expect(await get("/en/certifications", schema)).toEqual(expected)
    expect(await get("/ar/certifications", schema)).toEqual(expected)
  })
})

describe("languages", () => {
  it("answers on a Lang with a Translation, falling back per entry", async () => {
    const list = await get("/ru/languages", v.array(LanguageSkillSchema))
    expect(list).toEqual([
      {
        id: 1,
        fallback: false,
        code: "kk",
        name: "Казахский",
        level: "Родной",
      },
      { id: 2, fallback: true, code: "en", name: "English", level: "C1" },
    ])
  })

  it("falls back to EN", async () => {
    const list = await get("/es/languages", v.array(LanguageSkillSchema))
    expect(list.map((l) => [l.name, l.fallback])).toEqual([
      ["Kazakh", true],
      ["English", true],
    ])
  })
})

describe("technologies", () => {
  it("lists the directory by category", async () => {
    const list = await get("/en/technologies", v.array(TechnologySchema))
    expect(list.map((t) => t.name)).toEqual(["Hono", "React"])
  })
})

describe("projects", () => {
  it("lists projects on a Lang with a Translation, without the case study", async () => {
    const [alpha, beta] = await get("/ru/projects", v.array(ProjectSchema))
    expect(alpha).toEqual({
      id: 1,
      fallback: false,
      slug: "alpha",
      title: "Альфа",
      description: "Первый проект",
      status: "completed",
      coverKey: null,
      githubUrl: null,
      demoUrl: null,
      featured: true,
      inCv: true,
      cvBullets: ["Запустил"],
      hasCaseStudy: true,
      technologies: [
        { id: 1, name: "React", category: "frontend", icon: null },
      ],
    })
    expect(alpha).not.toHaveProperty("caseStudy")
    expect(beta).toMatchObject({
      slug: "beta",
      fallback: true,
      title: "Beta",
      hasCaseStudy: false,
    })
  })

  it("answers a project by slug with its case study", async () => {
    const alpha = await get("/ru/projects/alpha", ProjectDetailSchema)
    expect(alpha).toMatchObject({ fallback: false, caseStudy: "# Альфа" })
  })

  it("falls back to EN by slug", async () => {
    const alpha = await get("/de/projects/alpha", ProjectDetailSchema)
    expect(alpha).toMatchObject({ fallback: true, caseStudy: "# Alpha" })
  })

  it("answers 404 for an unknown slug", async () => {
    await expectError("/en/projects/nope", 404, "not_found")
  })

  it("binds the slug as a value, never as SQL", async () => {
    const slug = encodeURIComponent("nope' OR '1'='1")
    await expectError(`/en/projects/${slug}`, 404, "not_found")
  })
})

describe("posts", () => {
  it("lists published posts newest first, without drafts or bodies", async () => {
    const list = await get("/ru/posts", v.array(PostSchema))
    expect(list).toEqual([
      {
        id: 2,
        fallback: true,
        slug: "second",
        title: "Second",
        excerpt: "Two",
        readingMinutes: 3,
        coverKey: null,
        publishedAt: "2026-02-01T00:00:00.000Z",
        tags: [{ slug: "react", name: "React" }],
      },
      {
        id: 1,
        fallback: false,
        slug: "hello",
        title: "Привет",
        excerpt: "Хай",
        readingMinutes: 2,
        coverKey: null,
        publishedAt: "2026-01-01T00:00:00.000Z",
        tags: [{ slug: "cloudflare", name: "Cloudflare" }],
      },
    ])
  })

  it("filters by tag without letting drafts in", async () => {
    const list = await get("/en/posts?tag=cloudflare", v.array(PostSchema))
    expect(list.map((p) => p.slug)).toEqual(["hello"])
    expect(await get("/en/posts?tag=nope", v.array(PostSchema))).toEqual([])
  })

  it("rejects an empty tag", async () => {
    await expectError("/en/posts?tag=", 400, "invalid_request")
  })

  it("drops unknown query parameters", async () => {
    expect(
      await get("/en/posts?tag=nope&limit=1", v.array(PostSchema))
    ).toEqual([])
  })

  it("answers a post by slug with its body", async () => {
    const post = await get("/ru/posts/hello", PostDetailSchema)
    expect(post).toMatchObject({ fallback: false, body: "Тело" })
  })

  it("falls back to EN by slug", async () => {
    const post = await get("/kk/posts/hello", PostDetailSchema)
    expect(post).toMatchObject({ fallback: true, body: "Hello body" })
  })

  it("answers 404 for a draft and for an unknown slug", async () => {
    await expectError("/en/posts/secret", 404, "not_found")
    await expectError("/en/posts/nope", 404, "not_found")
  })
})

describe("albums", () => {
  it("lists albums on a Lang with a Translation, falling back per album", async () => {
    const list = await get("/ru/albums", v.array(AlbumSchema))
    expect(list).toEqual([
      {
        id: 1,
        fallback: false,
        slug: "trips",
        title: "Поездки",
        cover: { key: "photos/1.jpg", width: 1200, height: 800 },
        photoCount: 3,
      },
      {
        id: 2,
        fallback: true,
        slug: "cats",
        title: "Cats",
        cover: { key: "photos/4.jpg", width: 1000, height: 1000 },
        photoCount: 1,
      },
    ])
  })

  it("shows the chosen cover, else the first photo in order", async () => {
    await env.DB.prepare(
      "UPDATE album SET cover_key = 'photos/3.jpg' WHERE id = 1"
    ).run()
    expect((await get("/en/albums/trips", AlbumDetailSchema)).cover).toEqual({
      key: "photos/3.jpg",
      width: 1000,
      height: 1000,
    })
    await env.DB.batch([
      env.DB.prepare("UPDATE album SET cover_key = NULL WHERE id = 1"),
      env.DB.prepare("UPDATE photo SET position = -1 WHERE id = 2"),
    ])
    expect((await get("/en/albums/trips", AlbumDetailSchema)).cover).toEqual({
      key: "photos/2.jpg",
      width: 800,
      height: 1200,
    })
    await env.DB.prepare("UPDATE photo SET position = 1 WHERE id = 2").run()
  })

  it("lists an album without photos with no cover and a zero count", async () => {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO album (id, slug, position) VALUES (3, 'empty', 2)"
      ),
      env.DB.prepare(
        "INSERT INTO album_translation (album_id, lang, title) VALUES (3, 'en', 'Empty')"
      ),
    ])
    const list = await get("/en/albums", v.array(AlbumSchema))
    expect(list.find((album) => album.slug === "empty")).toMatchObject({
      cover: null,
      photoCount: 0,
    })
    await env.DB.prepare("DELETE FROM album WHERE id = 3").run()
  })

  it("answers an album by slug with its photos and captions", async () => {
    const album = await get("/ru/albums/trips", AlbumDetailSchema)
    expect(album.title).toBe("Поездки")
    expect(album.photos).toEqual([
      {
        id: 1,
        fallback: false,
        key: "photos/1.jpg",
        width: 1200,
        height: 800,
        caption: "Горы",
      },
      {
        id: 2,
        fallback: true,
        key: "photos/2.jpg",
        width: 800,
        height: 1200,
        caption: "Lake",
      },
      {
        id: 3,
        fallback: false,
        key: "photos/3.jpg",
        width: 1000,
        height: 1000,
        caption: null,
      },
    ])
  })

  it("falls back to EN by slug", async () => {
    const album = await get("/de/albums/trips", AlbumDetailSchema)
    expect(album.fallback).toBe(true)
    expect(album.photos.map((p) => [p.caption, p.fallback])).toEqual([
      ["Mountains", true],
      ["Lake", true],
      [null, false],
    ])
  })

  it("answers 404 for an unknown slug", async () => {
    await expectError("/en/albums/nope", 404, "not_found")
  })
})

describe("tracks", () => {
  it("lists tracks", async () => {
    expect(await get("/es/tracks", v.array(TrackSchema))).toEqual([
      {
        id: 1,
        title: "Night Drive",
        artist: "Someone",
        source: "https://example.com",
        license: "CC BY 4.0",
        key: "tracks/1.mp3",
        durationSeconds: 180,
      },
    ])
  })
})
