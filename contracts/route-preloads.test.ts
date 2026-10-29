import { describe, expect, it } from "vitest"

import { routeMatches, routePattern } from "./route-preloads"

describe("routePattern", () => {
  it.each([
    ["$lang/route", "/$lang/*"],
    ["$lang/index", "/$lang"],
    ["$lang/blog/index", "/$lang/blog"],
    ["$lang/blog/$slug", "/$lang/blog/$slug"],
    ["$lang/cv", "/$lang/cv"],
    ["$lang_.cv.print", "/$lang/cv/print"],
  ])("names %s %s", (file, pattern) => {
    expect(routePattern(file)).toBe(pattern)
  })

  it.each(["index", "__root", "admin/route", "admin/$entity/$id"])(
    "leaves %s out: no page under a Lang",
    (file) => {
      expect(routePattern(file)).toBeNull()
    }
  )
})

describe("routeMatches", () => {
  it.each([
    ["/$lang", "/en"],
    ["/$lang", "/en/"],
    ["/$lang/blog/$slug", "/ar/blog/edge-caching"],
    ["/$lang/*", "/en"],
    ["/$lang/*", "/en/gallery/astana"],
  ])("%s matches %s", (pattern, pathname) => {
    expect(routeMatches(pattern, pathname)).toBe(true)
  })

  it.each([
    ["/$lang", "/en/blog"],
    ["/$lang/blog", "/en/blog/edge-caching"],
    ["/$lang/blog/$slug", "/en/blog"],
    ["/$lang/blog/$slug", "/en/projects/edge-portfolio"],
    ["/$lang/cv", "/en/cv/print"],
  ])("%s doesn't match %s", (pattern, pathname) => {
    expect(routeMatches(pattern, pathname)).toBe(false)
  })
})
