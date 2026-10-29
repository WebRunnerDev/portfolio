// Route preloads (#142): the build puts a `<link rel="modulepreload">` for
// every chunk a page's route needs beyond the entry into index.html, each
// marked with the routes that need it (`data-route`, patterns below, space
// apart). The Worker keeps the links of the page it serves and drops the
// rest, so a page's code loads with the entry instead of after it.

export const ROUTE_ATTRIBUTE = "data-route"

// The pattern of a route file of src/app/routes (path without `.tsx`), or
// null for one that isn't a page under a Lang. `$name` stands for one
// segment; a layout (`route.tsx`) ends in `*`, any rest of the path.
//   `$lang/route` → `/$lang/*`, `$lang/index` → `/$lang`,
//   `$lang/blog/$slug` → `/$lang/blog/$slug`, `$lang_.cv.print` → `/$lang/cv/print`
export function routePattern(file: string): string | null {
  const segments = file
    .split(/[/.]/)
    .map((segment) => segment.replace(/_$/, ""))
  if (segments[0] !== "$lang") return null
  const last = segments.pop()
  if (last === "route") segments.push("*")
  else if (last !== "index") segments.push(last!)
  return `/${segments.join("/")}`
}

// Whether a pattern of `routePattern` matches a page's pathname.
export function routeMatches(pattern: string, pathname: string): boolean {
  const want = pattern.split("/").filter(Boolean)
  const have = pathname.split("/").filter(Boolean)
  for (const [i, segment] of want.entries()) {
    if (segment === "*") return true
    if (i >= have.length) return false
    if (!segment.startsWith("$") && segment !== have[i]) return false
  }
  return want.length === have.length
}
