import { findEntity, type EntityConfig } from "./entities"

// How the Admin groups its pages: the nav, the home page and the
// breadcrumbs. The site's content apart from the CV; the Profile, which
// feeds both, on its own above them. Every entity is in one section.

export type SectionItem = {
  // Under /admin: the entity's path, or the page's.
  path: string
  label: string
  // One line on the home page: what the page manages.
  hint: string
  // Listed under the item above it: a post's tags, an album's photos.
  nested?: true
} & (
  | { kind: "entity"; entity: EntityConfig }
  // A page of its own rather than an entity's list.
  | { kind: "cv-pdf" }
)

export type Section = {
  id: "profile" | "content" | "cv"
  // None: the section is its one item (the Profile).
  label?: string
  hint?: string
  items: SectionItem[]
}

function entityItem(
  path: string,
  hint: string,
  nested?: true
): SectionItem & { kind: "entity" } {
  const entity = findEntity(path)
  if (!entity) throw new Error(`No admin entity "${path}"`)
  return { kind: "entity", entity, path, label: entity.label, hint, nested }
}

export const SECTIONS: Section[] = [
  {
    id: "profile",
    items: [
      entityItem(
        "profile",
        "Name, headline, about and contacts: the home page, the contacts and the CV"
      ),
    ],
  },
  {
    id: "content",
    label: "Site content",
    hint: "What the site's pages show",
    items: [
      entityItem("projects", "Cards, case studies; In CV puts one in the CV"),
      entityItem("posts", "Blog posts: drafts and publishing"),
      entityItem("tags", "Labels of the posts", true),
      entityItem("albums", "Gallery albums with their photos"),
      entityItem("photos", "Every photo, album by album", true),
      entityItem("tracks", "The playlist"),
    ],
  },
  {
    id: "cv",
    label: "CV",
    hint: "The Web CV, the Print CV and its PDF",
    items: [
      entityItem("cv-sections", "Their order, on the web and in the PDF"),
      entityItem("experience", "Jobs: role, period, bullets"),
      entityItem("education", "Institutions and degrees"),
      entityItem("certifications", "Certificates with their links"),
      entityItem("languages", "Spoken languages and levels"),
      entityItem("technologies", "Also picked in projects and experience"),
      {
        kind: "cv-pdf",
        path: "cv-pdf",
        label: "CV PDF",
        hint: "Generate or upload the PDF of each Lang",
      },
    ],
  },
]

// The item at /admin/<path> and its section.
export function findItem(
  path: string
): { section: Section; item: SectionItem } | undefined {
  for (const section of SECTIONS) {
    const item = section.items.find((candidate) => candidate.path === path)
    if (item) return { section, item }
  }
  return undefined
}

// The tab's title: the page's name in the Admin, so its tabs differ.
export function adminTitle(pathname: string): string {
  const [, admin, page] = pathname.split("/")
  if (admin !== "admin" || !page) return "Admin · WebRunner"
  return `${findItem(page)?.item.label ?? "Not found"} · Admin · WebRunner`
}
