import * as v from "valibot"

// GET /api/public/:lang/* — published content on a Lang (worker/README.md ›
// Public API). An entity without a Translation on that Lang comes with its EN
// Translation and `fallback: true` (CONTEXT.md › Fallback). Untranslated
// entities (certification, technology, track) have no `fallback`.
//
// `*Key` fields are R2 object keys; their URLs come with the media route (#33).

const Fallback = { fallback: v.boolean() }

const Month = v.pipe(v.string(), v.regex(/^\d{4}-\d{2}$/))

export const TechnologySchema = v.object({
  id: v.number(),
  name: v.string(),
  category: v.picklist([
    "frontend",
    "backend_cloud",
    "qa_testing",
    "tools_design",
  ]),
  icon: v.nullable(v.string()),
})

export type Technology = v.InferOutput<typeof TechnologySchema>

// GET /api/public/:lang/profile
export const ProfileSchema = v.object({
  ...Fallback,
  name: v.string(),
  headline: v.string(),
  about: v.nullable(v.string()),
  location: v.nullable(v.string()),
  email: v.nullable(v.string()),
  telegramUrl: v.nullable(v.string()),
  linkedinUrl: v.nullable(v.string()),
  githubUrl: v.nullable(v.string()),
  photoKey: v.nullable(v.string()),
})

export type Profile = v.InferOutput<typeof ProfileSchema>

// GET /api/public/:lang/cv-sections — the sections shown on the Web CV, in
// order.
export const CvSectionSchema = v.object({
  type: v.picklist([
    "experience",
    "projects",
    "technologies",
    "education",
    "certifications",
    "languages",
  ]),
})

export type CvSection = v.InferOutput<typeof CvSectionSchema>

// GET /api/public/:lang/experience. `endMonth` null means "present".
export const ExperienceSchema = v.object({
  ...Fallback,
  id: v.number(),
  company: v.string(),
  companyUrl: v.nullable(v.string()),
  role: v.string(),
  location: v.nullable(v.string()),
  startMonth: Month,
  endMonth: v.nullable(Month),
  bullets: v.array(v.string()),
  technologies: v.array(TechnologySchema),
})

export type Experience = v.InferOutput<typeof ExperienceSchema>

// GET /api/public/:lang/education
export const EducationSchema = v.object({
  ...Fallback,
  id: v.number(),
  institution: v.string(),
  degree: v.string(),
  diploma: v.nullable(v.string()),
  gpa: v.nullable(v.string()),
  startMonth: Month,
  endMonth: v.nullable(Month),
})

export type Education = v.InferOutput<typeof EducationSchema>

// GET /api/public/:lang/certifications
export const CertificationSchema = v.object({
  id: v.number(),
  name: v.string(),
  issuer: v.string(),
  issuedMonth: v.nullable(Month),
  credentialUrl: v.nullable(v.string()),
})

export type Certification = v.InferOutput<typeof CertificationSchema>

// GET /api/public/:lang/languages. `code` is the ISO 639-1 code of the spoken
// language.
export const LanguageSkillSchema = v.object({
  ...Fallback,
  id: v.number(),
  code: v.string(),
  name: v.string(),
  level: v.string(),
})

export type LanguageSkill = v.InferOutput<typeof LanguageSkillSchema>

// GET /api/public/:lang/projects. `hasCaseStudy`: there is a
// /projects/:slug page.
export const ProjectSchema = v.object({
  ...Fallback,
  id: v.number(),
  slug: v.string(),
  title: v.string(),
  description: v.string(),
  status: v.picklist(["in_progress", "completed", "archived"]),
  coverKey: v.nullable(v.string()),
  githubUrl: v.nullable(v.string()),
  demoUrl: v.nullable(v.string()),
  featured: v.boolean(),
  inCv: v.boolean(),
  cvBullets: v.array(v.string()),
  hasCaseStudy: v.boolean(),
  technologies: v.array(TechnologySchema),
})

export type Project = v.InferOutput<typeof ProjectSchema>

// GET /api/public/:lang/projects/:slug
export const ProjectDetailSchema = v.object({
  ...ProjectSchema.entries,
  // Markdown.
  caseStudy: v.nullable(v.string()),
})

export type ProjectDetail = v.InferOutput<typeof ProjectDetailSchema>

export const TagSchema = v.object({ slug: v.string(), name: v.string() })

export type Tag = v.InferOutput<typeof TagSchema>

// GET /api/public/:lang/posts?tag=<slug> — published posts, newest first.
export const PostSchema = v.object({
  ...Fallback,
  id: v.number(),
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  readingMinutes: v.number(),
  coverKey: v.nullable(v.string()),
  publishedAt: v.string(),
  tags: v.array(TagSchema),
})

export type Post = v.InferOutput<typeof PostSchema>

export const PostsQuerySchema = v.strictObject({
  tag: v.optional(v.pipe(v.string(), v.nonEmpty())),
})

// GET /api/public/:lang/posts/:slug
export const PostDetailSchema = v.object({
  ...PostSchema.entries,
  // Markdown.
  body: v.string(),
})

export type PostDetail = v.InferOutput<typeof PostDetailSchema>

// GET /api/public/:lang/albums
export const AlbumSchema = v.object({
  ...Fallback,
  id: v.number(),
  slug: v.string(),
  title: v.string(),
  coverKey: v.nullable(v.string()),
})

export type Album = v.InferOutput<typeof AlbumSchema>

// A photo without any caption has `caption: null` and `fallback: false`.
export const PhotoSchema = v.object({
  ...Fallback,
  id: v.number(),
  key: v.string(),
  width: v.number(),
  height: v.number(),
  caption: v.nullable(v.string()),
})

export type Photo = v.InferOutput<typeof PhotoSchema>

// GET /api/public/:lang/albums/:slug
export const AlbumDetailSchema = v.object({
  ...AlbumSchema.entries,
  photos: v.array(PhotoSchema),
})

export type AlbumDetail = v.InferOutput<typeof AlbumDetailSchema>

// GET /api/public/:lang/tracks
export const TrackSchema = v.object({
  id: v.number(),
  title: v.string(),
  artist: v.string(),
  source: v.string(),
  license: v.string(),
  key: v.string(),
  durationSeconds: v.number(),
})

export type Track = v.InferOutput<typeof TrackSchema>
