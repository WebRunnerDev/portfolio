import { Hono } from "hono"
import {
  AlbumAdmin,
  CertificationAdmin,
  CvSectionAdmin,
  EducationAdmin,
  ExperienceAdmin,
  LanguageSkillAdmin,
  PhotoAdmin,
  PostAdmin,
  ProjectAdmin,
  TagAdmin,
  TechnologyAdmin,
  TrackAdmin,
} from "@contracts/api/admin"
import type { AdminEnv } from "../../access"
import { crudRoutes } from "../../admin"
import type { Entity } from "../../admin-store"
import { readingMinutes } from "../../reading-time"

// Every content entity of the data model (docs/plan.md › Модель данных) but
// the Profile, which is a single record (profile.ts). `fields` follow the
// schemas in contracts/api/admin.ts.

const technologies = (table: string) => ({
  field: "technologyIds",
  table: `${table}_technology`,
  column: "technology_id",
  target: "technology",
  ordered: true,
})

const cvSection: Entity = {
  table: "cv_section",
  fields: ["type", "showWeb", "showPdf"],
  booleans: ["showWeb", "showPdf"],
  ordered: true,
}

const technology: Entity = {
  table: "technology",
  fields: ["name", "category", "icon"],
  ordered: true,
}

const experience: Entity = {
  table: "experience",
  fields: ["companyUrl", "startMonth", "endMonth"],
  links: [technologies("experience")],
  translation: {
    fields: ["company", "role", "location", "bullets"],
    json: ["bullets"],
    enRequired: true,
  },
  ordered: true,
}

const education: Entity = {
  table: "education",
  fields: ["startMonth", "endMonth", "gpa"],
  translation: {
    fields: ["institution", "degree", "diploma"],
    enRequired: true,
  },
  ordered: true,
}

const certification: Entity = {
  table: "certification",
  fields: ["name", "issuer", "issuedMonth", "credentialUrl"],
  ordered: true,
}

const languageSkill: Entity = {
  table: "language_skill",
  fields: ["code"],
  translation: { fields: ["name", "level"], enRequired: true },
  ordered: true,
}

const project: Entity = {
  table: "project",
  fields: [
    "slug",
    "status",
    "coverKey",
    "githubUrl",
    "demoUrl",
    "featured",
    "inCv",
  ],
  files: ["coverKey"],
  booleans: ["featured", "inCv"],
  links: [technologies("project")],
  translation: {
    fields: ["title", "description", "cvBullets", "caseStudy"],
    json: ["cvBullets"],
    enRequired: true,
  },
  ordered: true,
  touch: true,
}

const post: Entity = {
  table: "post",
  fields: ["slug", "status", "coverKey", "publishedAt"],
  files: ["coverKey"],
  links: [
    {
      field: "tagIds",
      table: "post_tag",
      column: "tag_id",
      target: "tag",
      ordered: false,
    },
  ],
  translation: {
    fields: ["title", "excerpt", "body", "readingMinutes"],
    enRequired: true,
    normalize: (values) => ({
      ...values,
      readingMinutes: readingMinutes(String(values.body ?? "")),
    }),
  },
  orderBy: "created_at DESC, id DESC",
  touch: true,
  // A published post needs a date (CHECK in the schema): the first publish
  // sets it, a later draft keeps it.
  normalize: (row) =>
    row.status === "published" && row.publishedAt == null
      ? { ...row, publishedAt: new Date().toISOString() }
      : row,
}

const tag: Entity = {
  table: "tag",
  fields: ["slug", "name"],
  orderBy: "name",
}

// The cover is a photo's file, which the photo owns: no `files` here.
// Triggers clear it when that photo goes (migrations/0002).
const album: Entity = {
  table: "album",
  fields: ["slug", "coverKey"],
  translation: { fields: ["title"], enRequired: true },
  ordered: true,
  checkPatch: async (db, id, patch) => {
    if (patch.coverKey == null) return undefined
    const photo = await db
      .prepare("SELECT 1 FROM photo WHERE album_id = ? AND r2_key = ?")
      .bind(id, patch.coverKey)
      .first()
    return photo ? undefined : { coverKey: ["Not a photo of this album"] }
  },
}

const photo: Entity = {
  table: "photo",
  fields: ["albumId", "r2Key", "width", "height"],
  files: ["r2Key"],
  refs: { albumId: "album" },
  translation: { fields: ["caption"], enRequired: false },
  ordered: true,
  scope: "albumId",
}

const track: Entity = {
  table: "track",
  fields: ["title", "artist", "source", "license", "r2Key", "durationSeconds"],
  files: ["r2Key"],
  ordered: true,
}

// Mounted on /api/admin, behind the Access check.
export const content = new Hono<AdminEnv>()
  .route("/cv-sections", crudRoutes(cvSection, CvSectionAdmin))
  .route("/technologies", crudRoutes(technology, TechnologyAdmin))
  .route("/experience", crudRoutes(experience, ExperienceAdmin))
  .route("/education", crudRoutes(education, EducationAdmin))
  .route("/certifications", crudRoutes(certification, CertificationAdmin))
  .route("/languages", crudRoutes(languageSkill, LanguageSkillAdmin))
  .route("/projects", crudRoutes(project, ProjectAdmin))
  .route("/posts", crudRoutes(post, PostAdmin))
  .route("/tags", crudRoutes(tag, TagAdmin))
  .route("/albums", crudRoutes(album, AlbumAdmin))
  .route("/photos", crudRoutes(photo, PhotoAdmin))
  .route("/tracks", crudRoutes(track, TrackAdmin))
