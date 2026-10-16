import * as v from "valibot"
import { LANGS, type Lang } from "../lang"

// GET /api/admin/me — the owner signed in through Cloudflare Access (ADR-0004).
export const AdminMeResponseSchema = v.object({
  email: v.pipe(v.string(), v.email()),
})

export type AdminMeResponse = v.InferOutput<typeof AdminMeResponseSchema>

// /api/admin/<entity> — CRUD of the content (worker/README.md › Admin API).
// Each entity has four schemas:
// - `create`: POST body; translated entities carry `translations` with EN.
// - `patch`: PATCH body, any subset of the untranslated fields.
// - `translation`: PUT /:id/translations/:lang body.
// - `entity`: what every call answers with: the fields, `id` and all
//   Translations at once.
// Fields left out of `create` take the default shown here.

const Id = v.pipe(v.number(), v.integer(), v.minValue(1))

const Text = v.pipe(v.string(), v.trim(), v.nonEmpty())

const OptionalText = v.optional(v.nullable(Text), null)

const Month = v.pipe(
  v.string(),
  v.regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM")
)

const OptionalUrl = v.optional(v.nullable(v.pipe(v.string(), v.url())), null)

const Slug = v.pipe(
  v.string(),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a lowercase-kebab slug")
)

// R2 object key.
const Key = Text

const Lines = v.optional(v.array(Text), [])

function unique<T>(items: T[]) {
  return new Set(items).size === items.length
}

// Ids of linked rows, in display order.
const IdList = v.optional(
  v.pipe(v.array(Id), v.check(unique, "Ids must be unique")),
  []
)

const Flag = (fallback: boolean) => v.optional(v.boolean(), fallback)

// Any subset of Langs.
function translationsOf<T extends v.GenericSchema>(translation: T) {
  const entries = Object.fromEntries(
    LANGS.map((lang) => [lang, v.optional(translation)])
  ) as { [L in Lang]: v.OptionalSchema<T, undefined> }
  return v.object(entries)
}

// EN is required when an entity is created (CONTEXT.md › Fallback).
function translationsWithEn<T extends v.GenericSchema>(translation: T) {
  return v.object({ ...translationsOf(translation).entries, en: translation })
}

function plainEntity<F extends v.ObjectEntries>(fields: F) {
  const create = v.object(fields)
  return {
    create,
    patch: v.partial(create),
    entity: v.object({ id: Id, ...fields }),
  }
}

function translatedEntity<
  F extends v.ObjectEntries,
  T extends v.ObjectSchema<v.ObjectEntries, undefined>,
>(fields: F, translation: T) {
  return {
    create: v.object({
      ...fields,
      translations: translationsWithEn(translation),
    }),
    patch: v.partial(v.object(fields)),
    translation,
    entity: v.object({
      id: Id,
      ...fields,
      translations: translationsOf(translation),
    }),
  }
}

type Schemas = {
  create: v.GenericSchema
  patch: v.GenericSchema
  entity: v.GenericSchema
  translation?: v.GenericSchema
}

// `AdminEntity<typeof ProjectAdmin>` and so on.
export type AdminEntity<S extends Schemas> = v.InferOutput<S["entity"]>
export type AdminCreate<S extends Schemas> = v.InferInput<S["create"]>
export type AdminPatch<S extends Schemas> = v.InferInput<S["patch"]>
export type AdminTranslation<S extends Required<Schemas>> = v.InferInput<
  S["translation"]
>

// /api/admin/profile — a single record (`id` 1): PUT creates or updates it,
// there is no list and no id in the path. No phone (CONTEXT.md › Profile).
const profileFields = {
  email: v.optional(v.nullable(v.pipe(v.string(), v.email())), null),
  telegramUrl: OptionalUrl,
  linkedinUrl: OptionalUrl,
  githubUrl: OptionalUrl,
  photoKey: v.optional(v.nullable(Key), null),
}

const ProfileTranslationSchema = v.object({
  name: Text,
  headline: Text,
  about: OptionalText,
  location: OptionalText,
})

export const ProfileAdmin = translatedEntity(
  profileFields,
  ProfileTranslationSchema
)

// /api/admin/cv-sections — one per type.
export const CvSectionAdmin = plainEntity({
  type: v.picklist([
    "experience",
    "projects",
    "technologies",
    "education",
    "certifications",
    "languages",
  ]),
  showWeb: Flag(true),
  showPdf: Flag(true),
})

// /api/admin/technologies
export const TechnologyAdmin = plainEntity({
  name: Text,
  category: v.picklist([
    "frontend",
    "backend_cloud",
    "qa_testing",
    "tools_design",
  ]),
  icon: OptionalText,
})

// /api/admin/experience. `endMonth` null means "present".
export const ExperienceAdmin = translatedEntity(
  {
    companyUrl: OptionalUrl,
    startMonth: Month,
    endMonth: v.optional(v.nullable(Month), null),
    technologyIds: IdList,
  },
  v.object({
    company: Text,
    role: Text,
    location: OptionalText,
    bullets: Lines,
  })
)

// /api/admin/education. `gpa` is free text ("3.6 / 4.0").
export const EducationAdmin = translatedEntity(
  {
    startMonth: Month,
    endMonth: v.optional(v.nullable(Month), null),
    gpa: OptionalText,
  },
  v.object({ institution: Text, degree: Text, diploma: OptionalText })
)

// /api/admin/certifications — not translated.
export const CertificationAdmin = plainEntity({
  name: Text,
  issuer: Text,
  issuedMonth: v.optional(v.nullable(Month), null),
  credentialUrl: OptionalUrl,
})

// /api/admin/languages. `code` is the ISO 639-1 code of the spoken language.
export const LanguageSkillAdmin = translatedEntity(
  { code: v.pipe(v.string(), v.regex(/^[a-z]{2}$/, "Expected ISO 639-1")) },
  v.object({ name: Text, level: Text })
)

// /api/admin/projects. `caseStudy` is Markdown; null means no
// /projects/:slug page.
export const ProjectAdmin = translatedEntity(
  {
    slug: Slug,
    status: v.optional(
      v.picklist(["in_progress", "completed", "archived"]),
      "in_progress"
    ),
    coverKey: v.optional(v.nullable(Key), null),
    githubUrl: OptionalUrl,
    demoUrl: OptionalUrl,
    featured: Flag(false),
    inCv: Flag(false),
    technologyIds: IdList,
  },
  v.object({
    title: Text,
    description: Text,
    cvBullets: Lines,
    caseStudy: v.optional(v.nullable(v.pipe(v.string(), v.nonEmpty())), null),
  })
)

// /api/admin/posts, drafts included. Publishing without `publishedAt` sets it
// to now; going back to draft keeps it.
export const PostAdmin = translatedEntity(
  {
    slug: Slug,
    status: v.optional(v.picklist(["draft", "published"]), "draft"),
    coverKey: v.optional(v.nullable(Key), null),
    publishedAt: v.optional(
      v.nullable(v.pipe(v.string(), v.isoTimestamp())),
      null
    ),
    tagIds: IdList,
  },
  v.object({
    title: Text,
    excerpt: v.optional(v.string(), ""),
    // Markdown.
    body: v.optional(v.string(), ""),
    readingMinutes: v.optional(
      v.pipe(v.number(), v.integer(), v.minValue(0)),
      1
    ),
  })
)

// /api/admin/tags
export const TagAdmin = plainEntity({ slug: Slug, name: Text })

// /api/admin/albums. Deleting one that still has photos answers 409.
export const AlbumAdmin = translatedEntity(
  { slug: Slug, coverKey: v.optional(v.nullable(Key), null) },
  v.object({ title: Text })
)

// /api/admin/photos?albumId=<id>. The caption is optional, so a photo needs
// no Translation, EN included.
const Pixels = v.pipe(v.number(), v.integer(), v.minValue(1))

const photoFields = { albumId: Id, r2Key: Key, width: Pixels, height: Pixels }

const PhotoTranslationSchema = v.object({ caption: Text })

export const PhotoAdmin = {
  ...translatedEntity(photoFields, PhotoTranslationSchema),
  create: v.object({
    ...photoFields,
    translations: v.optional(translationsOf(PhotoTranslationSchema), {}),
  }),
}

// /api/admin/tracks — not translated.
export const TrackAdmin = plainEntity({
  title: Text,
  artist: Text,
  source: Text,
  license: Text,
  r2Key: Key,
  durationSeconds: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

// PUT /api/admin/<entity>/order — the new order of (some of) its rows;
// positions follow the array.
export const ReorderSchema = v.object({
  ids: v.pipe(v.array(Id), v.nonEmpty(), v.check(unique, "Ids must be unique")),
})

export type Reorder = v.InferOutput<typeof ReorderSchema>
