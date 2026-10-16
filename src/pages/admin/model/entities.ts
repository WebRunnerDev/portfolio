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
// shows it: the list columns and the fields of the create form. Values and
// rules come from the schemas in contracts/api/admin.ts.

export type Field = {
  name: string
  label: string
  // Lives in `translations.en` rather than on the row.
  translated?: boolean
  hint?: string
} & (
  | { kind: "text" | "textarea" | "url" | "email" | "month" | "slug" }
  // One item per line.
  | { kind: "lines" }
  | { kind: "number" }
  | { kind: "boolean"; initial: boolean }
  | { kind: "select"; options: readonly string[]; initial?: string }
  // The id of a row of another entity: a photo's album.
  | { kind: "ref"; entity: string }
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
  schemas: { create: v.GenericSchema; entity: v.GenericSchema }
  translated: boolean
  // Rows have a position: the list can move them (PUT /order).
  ordered: boolean
  // Rows are listed and ordered within one row of another entity.
  scope?: { field: string; entity: string; label: string }
  // A single record without an id in the path (the Profile).
  single?: boolean
  // The row's name in lists and headings: the first of these fields that is
  // set, EN Translation first.
  titleFields: string[]
  // The first column holds the title and links to the editor.
  columns: Column[]
  createFields: Field[]
}

const period: Column = { label: "Period", field: "startMonth", kind: "period" }

export const ENTITIES: EntityConfig[] = [
  {
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
    createFields: [
      { name: "name", label: "Name", translated: true, kind: "text" },
      { name: "headline", label: "Headline", translated: true, kind: "text" },
      { name: "about", label: "About", translated: true, kind: "textarea" },
      { name: "location", label: "Location", translated: true, kind: "text" },
      { name: "email", label: "Email", kind: "email" },
      { name: "telegramUrl", label: "Telegram URL", kind: "url" },
      { name: "linkedinUrl", label: "LinkedIn URL", kind: "url" },
      { name: "githubUrl", label: "GitHub URL", kind: "url" },
    ],
  },
  {
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
    createFields: [
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
  },
  {
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
    createFields: [
      { name: "company", label: "Company", translated: true, kind: "text" },
      { name: "role", label: "Role", translated: true, kind: "text" },
      { name: "location", label: "Location", translated: true, kind: "text" },
      { name: "companyUrl", label: "Company URL", kind: "url" },
      { name: "startMonth", label: "Start", kind: "month" },
      { name: "endMonth", label: "End", kind: "month", hint: "Empty: present" },
      { name: "bullets", label: "Bullets", translated: true, kind: "lines" },
    ],
  },
  {
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
    createFields: [
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
  },
  {
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
    createFields: [
      { name: "name", label: "Name", kind: "text" },
      { name: "issuer", label: "Issuer", kind: "text" },
      { name: "issuedMonth", label: "Issued", kind: "month" },
      { name: "credentialUrl", label: "Credential URL", kind: "url" },
    ],
  },
  {
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
    createFields: [
      { name: "name", label: "Name", translated: true, kind: "text" },
      { name: "level", label: "Level", translated: true, kind: "text" },
      { name: "code", label: "Code", kind: "text", hint: "ISO 639-1: en, kk" },
    ],
  },
  {
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
    createFields: [
      { name: "name", label: "Name", kind: "text" },
      {
        name: "category",
        label: "Category",
        kind: "select",
        options: ["frontend", "backend_cloud", "qa_testing", "tools_design"],
      },
      { name: "icon", label: "Icon", kind: "text" },
    ],
  },
  {
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
    createFields: [
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
    ],
  },
  {
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
    createFields: [
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
    ],
  },
  {
    path: "tags",
    label: "Tags",
    singular: "tag",
    schemas: TagAdmin,
    translated: false,
    ordered: false,
    titleFields: ["name"],
    columns: [{ label: "Slug", field: "slug", kind: "text" }],
    createFields: [
      { name: "name", label: "Name", kind: "text" },
      { name: "slug", label: "Slug", kind: "slug" },
    ],
  },
  {
    path: "albums",
    label: "Albums",
    singular: "album",
    schemas: AlbumAdmin,
    translated: true,
    ordered: true,
    titleFields: ["title", "slug"],
    columns: [
      { label: "Cover", field: "coverKey", kind: "image" },
      { label: "Slug", field: "slug", kind: "text" },
    ],
    createFields: [
      { name: "title", label: "Title", translated: true, kind: "text" },
      { name: "slug", label: "Slug", kind: "slug" },
    ],
  },
  {
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
    createFields: [
      { name: "albumId", label: "Album", kind: "ref", entity: "albums" },
      {
        name: "r2Key",
        label: "File",
        kind: "file",
        accept: "image/jpeg,image/png,image/webp",
        fills: "image-size",
      },
      { name: "caption", label: "Caption", translated: true, kind: "text" },
    ],
  },
  {
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
    createFields: [
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
  },
]

export function findEntity(path: string) {
  return ENTITIES.find((entity) => entity.path === path)
}
