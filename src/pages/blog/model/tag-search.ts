// `?tag=<slug>`: the Tag the list is filtered by. The router parses search
// values as JSON, so `?tag=2024` comes as a number; anything empty is no
// filter.
export type TagSearch = { tag?: string }

export function parseTagSearch(search: Record<string, unknown>): TagSearch {
  const { tag } = search
  if (typeof tag !== "string" && typeof tag !== "number") return {}
  const slug = String(tag).trim()
  return slug ? { tag: slug } : {}
}
