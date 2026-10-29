// The Public API requests the loader of a page under a Lang makes (#142), as
// paths after `/api/public/{lang}/`, exactly as `@/shared/api` spells them.
// The Worker preloads them with the page's HTML, so the data doesn't wait for
// the app's code. `src/app/page-requests.test.ts` runs every loader against
// this list.

const CV = [
  "profile",
  "experience",
  "projects",
  "technologies",
  "education",
  "certifications",
  "languages",
]

// `%E0` and the like: no slug, so no request.
function slugPath(prefix: string, encoded: string) {
  try {
    return [`${prefix}/${encodeURIComponent(decodeURIComponent(encoded))}`]
  } catch {
    return []
  }
}

// `path` is the page's path after the Lang (`parsePagePath`), `search` its
// query. An unknown path asks nothing. A Blog filtered by a Tag isn't
// preloaded: the router reads `?tag` its own way (JSON), so the request may
// differ.
export function pageRequests(path: string, search: URLSearchParams): string[] {
  const [section, slug, ...rest] = path ? path.split("/") : []
  if (rest.length) return []

  if (slug === undefined) {
    switch (section) {
      case undefined:
        return ["profile", "projects", "posts", "albums"]
      case "cv":
        return [...CV, "cv-sections?form=web", "cv-pdf"]
      case "projects":
        return ["projects"]
      case "gallery":
        return ["albums"]
      case "blog":
        return search.has("tag") ? [] : ["posts"]
      default:
        return []
    }
  }
  switch (section) {
    case "cv":
      return slug === "print" ? [...CV, "cv-sections?form=print"] : []
    case "projects":
      return slugPath("projects", slug)
    case "gallery":
      return slugPath("albums", slug)
    case "blog": {
      const post = slugPath("posts", slug)
      return post.length ? [...post, "profile"] : []
    }
    default:
      return []
  }
}
