import * as v from "valibot"
import {
  CertificationSchema,
  CvSectionSchema,
  EducationSchema,
  ExperienceSchema,
  LanguageSkillSchema,
  ProfileSchema,
  ProjectDetailSchema,
  ProjectSchema,
  TechnologySchema,
} from "@contracts/api/public"
import { ApiErrorSchema, type ApiErrorCode } from "@contracts/api/errors"
import type { Lang } from "@contracts/lang"

// Client of GET /api/public/:lang/* (worker/README.md › Public API). Every
// call either answers with the body checked against its schema in
// contracts/api/public.ts or throws a PublicApiError.

// `network_error`: no answer at all (offline, aborted). `bad_response`: the
// answer doesn't match its schema.
export type PublicErrorCode = ApiErrorCode | "network_error" | "bad_response"

export class PublicApiError extends Error {
  readonly status: number
  readonly code: PublicErrorCode

  constructor(status: number, code: PublicErrorCode) {
    super(code)
    this.status = status
    this.code = code
  }
}

export function isNotFound(error: unknown) {
  return error instanceof PublicApiError && error.status === 404
}

type Options = { signal?: AbortSignal }

async function get<S extends v.GenericSchema>(
  lang: Lang,
  path: string,
  schema: S,
  { signal }: Options = {}
): Promise<v.InferOutput<S>> {
  let response: Response
  try {
    response = await fetch(`/api/public/${lang}/${path}`, { signal })
  } catch {
    throw new PublicApiError(0, "network_error")
  }
  const body: unknown = await response.json().catch(() => undefined)

  if (!response.ok) {
    const error = v.safeParse(ApiErrorSchema, body)
    throw new PublicApiError(
      response.status,
      error.success ? error.output.error : "bad_response"
    )
  }
  const result = v.safeParse(schema, body)
  if (!result.success) {
    console.error(`Unexpected public API answer for ${path}`, result.issues)
    throw new PublicApiError(response.status, "bad_response")
  }
  return result.output
}

// 404 until the Profile has a Translation.
export const getProfile = (lang: Lang, options?: Options) =>
  get(lang, "profile", ProfileSchema, options)

export const getCvSections = (lang: Lang, options?: Options) =>
  get(lang, "cv-sections", v.array(CvSectionSchema), options)

export const getExperience = (lang: Lang, options?: Options) =>
  get(lang, "experience", v.array(ExperienceSchema), options)

export const getEducation = (lang: Lang, options?: Options) =>
  get(lang, "education", v.array(EducationSchema), options)

export const getCertifications = (lang: Lang, options?: Options) =>
  get(lang, "certifications", v.array(CertificationSchema), options)

export const getLanguages = (lang: Lang, options?: Options) =>
  get(lang, "languages", v.array(LanguageSkillSchema), options)

export const getTechnologies = (lang: Lang, options?: Options) =>
  get(lang, "technologies", v.array(TechnologySchema), options)

export const getProjects = (lang: Lang, options?: Options) =>
  get(lang, "projects", v.array(ProjectSchema), options)

// 404 for an unknown slug.
export const getProject = (lang: Lang, slug: string, options?: Options) =>
  get(
    lang,
    `projects/${encodeURIComponent(slug)}`,
    ProjectDetailSchema,
    options
  )
