import type * as v from "valibot"
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

// Every entity of /api/admin/* (worker/README.md › Admin API) as the admin
// shows it: the list columns and the fields of the create form and the
// editor. Values and rules come from the schemas in contracts/api/admin.ts.

export type Field = {
  name: string
  label: string
  // Lives in a Translation (`translations.<lang>`) rather than on the row.
  translated?: boolean
  // false: only in the editor, not in the create form.
  create?: false
  hint?: string
} & (
  | { kind: "text" | "textarea" | "url" | "email" | "month" | "slug" }
  // A long Markdown text: a case study, a post body.
  | { kind: "markdown" }
  // An ISO timestamp, edited in local time.
  | { kind: "datetime" }
  // One item per line.
  | { kind: "lines" }
  | { kind: "number" }
  | { kind: "boolean"; initial: boolean }
  | { kind: "select"; options: readonly string[]; initial?: string }
  // The id of a row of another entity: a photo's album.
  | { kind: "ref"; entity: string }
  // Ids of rows of another entity: a project's technologies. `addable`: a
  // new row of it can be created right there (a post's tags).
  | { kind: "refs"; entity: string; addable?: true }
  // The file of one of the row's `gallery` rows: an album's cover photo.
  | { kind: "cover" }
  // An R2 key, filled by an upload. `fills` derives more fields from the file.
  | {
      kind: "file"
      accept: string
      fills?: "image-size" | "audio-duration"
    }
)

export type Column = {
  label: string
  field: string
  translated?: boolean
  kind:
    | "text"
    | "status"
    | "flag"
    | "month"
    // `startMonth` to `endMonth`; a null end means "present".
    | "period"
    | "date"
    | "duration"
    | "image"
}

export type EntityConfig = {
  // The path under /api/admin and /admin.
  path: string
  label: string
  singular: string
  schemas: {
    create: v.GenericSchema
    patch: v.GenericSchema
    entity: v.GenericSchema
    translation?: v.GenericSchema
  }
  translated: boolean
  // Rows have a position: the list can move them (PUT /order).
  ordered: boolean
  // Rows are listed and ordered within one row of another entity.
  scope?: { field: string; entity: string; label: string }
  // The path of a scoped entity whose rows the editor lists under the row,
  // filled by uploading many files at once: an album's photos.
  gallery?: string
  // A single record without an id in the path (the Profile).
  single?: boolean
  // The row's name in lists and headings: the first of these fields that is
  // set, EN Translation first.
  titleFields: string[]
  // The first column holds the title and links to the editor.
  columns: Column[]
  // What the editor shows, in order: translated fields on the Lang tabs, the
  // rest above them.
  fields: Field[]
  // The fields without `create: false`.
  createFields: Field[]
}

const period: Column = { label: "Period", field: "startMonth", kind: "period" }

const IMAGE = "image/jpeg,image/png,image/webp"

function image(name: string, label: string): Field {
  return { name, label, kind: "file", accept: IMAGE, create: false }
}

function entity(config: Omit<EntityConfig, "createFields">): EntityConfig {
  return {
    ...config,
    createFields: config.fields.filter((field) => field.create !== false),
  }
}

export const ENTITIES: EntityConfig[] = [
  entity({
    path: "profile",
    label: "Profile",
    singular: "profile",
    schemas: ProfileAdmin,
    translated: true,
    ordered: false,
    single: true,
    titleFields: ["name"],
    columns: [
      { label: "Headline", field: "headline", translated: true, kind: "text" },
      { label: "Email", field: "email", kind: "text" },
    ],
    fields: [
      { name: "name", label: "Name", translated: true, kind: "text" },
      { name: "headline", label: "Headline", translated: true, kind: "text" },
      { name: "about", label: "About", translated: true, kind: "textarea" },
      { name: "location", label: "Location", translated: true, kind: "text" },
      { name: "email", label: "Email", kind: "email" },
      { name: "telegramUrl", label: "Telegram URL", kind: "url" },
      { name: "linkedinUrl", label: "LinkedIn URL", kind: "url" },
      { name: "githubUrl", label: "GitHub URL", kind: "url" },
      image("photoKey", "Photo"),
    ],
  }),
  entity({
    path: "cv-sections",
    label: "CV sections",
    singular: "CV section",
    schemas: CvSectionAdmin,
    translated: false,
    ordered: true,
    titleFields: ["type"],
    columns: [
      { label: "Web", field: "showWeb", kind: "flag" },
      { label: "PDF", field: "showPdf", kind: "flag" },
    ],
    fields: [
      {
        name: "type",
        label: "Type",
        kind: "select",
        options: [
          "experience",
          "projects",
          "technologies",
          "education",
          "certifications",
          "languages",
        ],
      },
      {
        name: "showWeb",
        label: "Show on the web",
        kind: "boolean",
        initial: true,
      },
      {
        name: "showPdf",
        label: "Show in the PDF",
        kind: "boolean",
        initial: true,
      },
    ],
  }),
  entity({
    path: "experience",
    label: "Experience",
    singular: "experience",
    schemas: ExperienceAdmin,
    translated: true,
    ordered: true,
    titleFields: ["company"],
    columns: [
      { label: "Role", field: "role", translated: true, kind: "text" },
      period,
    ],
    fields: [
      { name: "company", label: "Company", translated: true, kind: "text" },
      { name: "role", label: "Role", translated: true, kind: "text" },
      { name: "location", label: "Location", translated: true, kind: "text" },
      { name: "companyUrl", label: "Company URL", kind: "url" },
      { name: "startMonth", label: "Start", kind: "month" },
      { name: "endMonth", label: "End", kind: "month", hint: "Empty: present" },
      {
        name: "technologyIds",
        label: "Technologies",
        kind: "refs",
        entity: "technologies",
        create: false,
      },
      { name: "bullets", label: "Bullets", translated: true, kind: "lines" },
    ],
  }),
  entity({
    path: "education",
    label: "Education",
    singular: "education",
    schemas: EducationAdmin,
    translated: true,
    ordered: true,
    titleFields: ["institution"],
    columns: [
      { label: "Degree", field: "degree", translated: true, kind: "text" },
      period,
    ],
    fields: [
      {
        name: "institution",
        label: "Institution",
        translated: true,
        kind: "text",
      },
      { name: "degree", label: "Degree", translated: true, kind: "text" },
      { name: "diploma", label: "Diploma", translated: true, kind: "text" },
      { name: "startMonth", label: "Start", kind: "month" },
      { name: "endMonth", label: "End", kind: "month", hint: "Empty: present" },
      { name: "gpa", label: "GPA", kind: "text", hint: "Free text: 3.6 / 4.0" },
    ],
  }),
  entity({
    path: "certifications",
    label: "Certifications",
    singular: "certification",
    schemas: CertificationAdmin,
    translated: false,
    ordered: true,
    titleFields: ["name"],
    columns: [
      { label: "Issuer", field: "issuer", kind: "text" },
      { label: "Issued", field: "issuedMonth", kind: "month" },
    ],
    fields: [
      { name: "name", label: "Name", kind: "text" },
      { name: "issuer", label: "Issuer", kind: "text" },
      { name: "issuedMonth", label: "Issued", kind: "month" },
      { name: "credentialUrl", label: "Credential URL", kind: "url" },
    ],
  }),
  entity({
    path: "languages",
    label: "Languages",
    singular: "language",
    schemas: LanguageSkillAdmin,
    translated: true,
    ordered: true,
    titleFields: ["name"],
    columns: [
      { label: "Code", field: "code", kind: "text" },
      { label: "Level", field: "level", translated: true, kind: "text" },
    ],
    fields: [
      { name: "name", label: "Name", translated: true, kind: "text" },
      { name: "level", label: "Level", translated: true, kind: "text" },
      { name: "code", label: "Code", kind: "text", hint: "ISO 639-1: en, kk" },
    ],
  }),
  entity({
    path: "technologies",
    label: "Technologies",
    singular: "technology",
    schemas: TechnologyAdmin,
    translated: false,
    ordered: true,
    titleFields: ["name"],
    columns: [
      { label: "Category", field: "category", kind: "status" },
      { label: "Icon", field: "icon", kind: "text" },
    ],
    fields: [
      { name: "name", label: "Name", kind: "text" },
      {
        name: "category",
        label: "Category",
        kind: "select",
        options: ["frontend", "backend_cloud", "qa_testing", "tools_design"],
      },
      { name: "icon", label: "Icon", kind: "text" },
    ],
  }),
  entity({
    path: "projects",
    label: "Projects",
    singular: "project",
    schemas: ProjectAdmin,
    translated: true,
    ordered: true,
    titleFields: ["title", "slug"],
    columns: [
      { label: "Slug", field: "slug", kind: "text" },
      { label: "Status", field: "status", kind: "status" },
      { label: "Featured", field: "featured", kind: "flag" },
      { label: "In CV", field: "inCv", kind: "flag" },
    ],
    fields: [
      { name: "title", label: "Title", translated: true, kind: "text" },
      { name: "slug", label: "Slug", kind: "slug" },
      {
        name: "description",
        label: "Description",
        translated: true,
        kind: "textarea",
      },
      {
        name: "status",
        label: "Status",
        kind: "select",
        options: ["in_progress", "completed", "archived"],
        initial: "in_progress",
      },
      { name: "githubUrl", label: "GitHub URL", kind: "url" },
      { name: "demoUrl", label: "Demo URL", kind: "url" },
      { name: "featured", label: "Featured", kind: "boolean", initial: false },
      { name: "inCv", label: "In CV", kind: "boolean", initial: false },
      image("coverKey", "Cover"),
      {
        name: "technologyIds",
        label: "Technologies",
        kind: "refs",
        entity: "technologies",
        create: false,
      },
      {
        name: "cvBullets",
        label: "CV bullets",
        translated: true,
        kind: "lines",
        create: false,
      },
      {
        name: "caseStudy",
        label: "Case study",
        translated: true,
        kind: "markdown",
        create: false,
        hint: "Markdown. Empty: no case study page",
      },
    ],
  }),
  entity({
    path: "posts",
    label: "Posts",
    singular: "post",
    schemas: PostAdmin,
    translated: true,
    ordered: false,
    titleFields: ["title", "slug"],
    columns: [
      { label: "Slug", field: "slug", kind: "text" },
      { label: "Status", field: "status", kind: "status" },
      { label: "Published", field: "publishedAt", kind: "date" },
    ],
    fields: [
      { name: "title", label: "Title", translated: true, kind: "text" },
      { name: "slug", label: "Slug", kind: "slug" },
      { name: "excerpt", label: "Excerpt", translated: true, kind: "textarea" },
      {
        name: "status",
        label: "Status",
        kind: "select",
        options: ["draft", "published"],
        initial: "draft",
      },
      {
        name: "publishedAt",
        label: "Published at",
        kind: "datetime",
        create: false,
        hint: "Empty: set when published",
      },
      image("coverKey", "Cover"),
      {
        name: "tagIds",
        label: "Tags",
        kind: "refs",
        entity: "tags",
        addable: true,
        create: false,
      },
      {
        name: "body",
        label: "Body",
        translated: true,
        kind: "markdown",
        create: false,
        hint: "Markdown. The reading time is counted from it on save",
      },
    ],
  }),
  entity({
    path: "tags",
    label: "Tags",
    singular: "tag",
    schemas: TagAdmin,
    translated: false,
    ordered: false,
    titleFields: ["name"],
    columns: [{ label: "Slug", field: "slug", kind: "text" }],
    fields: [
      { name: "name", label: "Name", kind: "text" },
      { name: "slug", label: "Slug", kind: "slug" },
    ],
  }),
  entity({
    path: "albums",
    label: "Albums",
    singular: "album",
    schemas: AlbumAdmin,
    translated: true,
    ordered: true,
    gallery: "photos",
    titleFields: ["title", "slug"],
    columns: [
      { label: "Cover", field: "coverKey", kind: "image" },
      { label: "Slug", field: "slug", kind: "text" },
    ],
    fields: [
      { name: "title", label: "Title", translated: true, kind: "text" },
      { name: "slug", label: "Slug", kind: "slug" },
      {
        name: "coverKey",
        label: "Cover",
        kind: "cover",
        create: false,
        hint: "None chosen: the first photo",
      },
    ],
  }),
  entity({
    path: "photos",
    label: "Photos",
    singular: "photo",
    schemas: PhotoAdmin,
    translated: true,
    ordered: true,
    scope: { field: "albumId", entity: "albums", label: "Album" },
    titleFields: ["caption", "r2Key"],
    columns: [
      { label: "Photo", field: "r2Key", kind: "image" },
      { label: "Width", field: "width", kind: "text" },
      { label: "Height", field: "height", kind: "text" },
    ],
    fields: [
      { name: "albumId", label: "Album", kind: "ref", entity: "albums" },
      {
        name: "r2Key",
        label: "File",
        kind: "file",
        accept: IMAGE,
        fills: "image-size",
      },
      // Filled from the file; the create form takes them from the upload.
      { name: "width", label: "Width", kind: "number", create: false },
      { name: "height", label: "Height", kind: "number", create: false },
      { name: "caption", label: "Caption", translated: true, kind: "text" },
    ],
  }),
  entity({
    path: "tracks",
    label: "Tracks",
    singular: "track",
    schemas: TrackAdmin,
    translated: false,
    ordered: true,
    titleFields: ["title"],
    columns: [
      { label: "Artist", field: "artist", kind: "text" },
      { label: "License", field: "license", kind: "text" },
      { label: "Length", field: "durationSeconds", kind: "duration" },
    ],
    fields: [
      { name: "title", label: "Title", kind: "text" },
      { name: "artist", label: "Artist", kind: "text" },
      { name: "source", label: "Source", kind: "text" },
      { name: "license", label: "License", kind: "text" },
      {
        name: "r2Key",
        label: "File",
        kind: "file",
        accept: "audio/mpeg,audio/mp4,audio/ogg",
        fills: "audio-duration",
      },
      {
        name: "durationSeconds",
        label: "Length, seconds",
        kind: "number",
        hint: "Filled from the file",
      },
    ],
  }),
]

export function findEntity(path: string) {
  return ENTITIES.find((entity) => entity.path === path)
}
