import { describe, expect, it } from "vitest"

import {
  coverKey,
  leavesHome,
  pageTransitionTypes,
  transitionDirection,
} from "."

describe("transitionDirection", () => {
  it("goes forward into the hierarchy and back out of it", () => {
    expect(transitionDirection("/en", "/en/projects")).toBe("forward")
    expect(transitionDirection("/en/projects", "/en/projects/plotops")).toBe(
      "forward"
    )
    expect(transitionDirection("/en/blog/hello", "/en/blog")).toBe("back")
    expect(transitionDirection("/en/gallery", "/en")).toBe("back")
  })

  it("has no direction on one level", () => {
    expect(transitionDirection("/en/projects", "/en/blog")).toBeNull()
    expect(transitionDirection("/en/projects", "/ru/projects")).toBeNull()
  })
})

describe("coverKey", () => {
  it("names the cover of a Project, a Post and an Album", () => {
    expect(coverKey("/en/projects/plotops")).toBe("project:plotops")
    expect(coverKey("/ar/blog/hello/")).toBe("post:hello")
    expect(coverKey("/kk/gallery/almaty")).toBe("album:almaty")
  })

  it("has none for a list or another page", () => {
    expect(coverKey("/en/projects")).toBeNull()
    expect(coverKey("/en/cv/print")).toBeNull()
    expect(coverKey("/en/projects/plotops/more")).toBeNull()
  })
})

describe("pageTransitionTypes", () => {
  it("leaves a change of the search alone (the Lightbox)", () => {
    const album = { pathname: "/en/gallery/almaty" }
    expect(
      pageTransitionTypes({
        fromLocation: album,
        toLocation: album,
        pathChanged: false,
      })
    ).toEqual([])
  })

  it("has no direction on the first load", () => {
    expect(
      pageTransitionTypes({
        toLocation: { pathname: "/en" },
        pathChanged: true,
      })
    ).toEqual([])
  })
})

describe("leavesHome", () => {
  const change = (from: string | undefined, to: string, pathChanged = true) =>
    leavesHome({
      fromLocation: from === undefined ? undefined : { pathname: from },
      toLocation: { pathname: to },
      pathChanged,
    })

  it("is the home page to another page", () => {
    expect(change("/en", "/en/projects/plotops")).toBe(true)
    expect(change("/ar/", "/ar/cv")).toBe(true)
  })

  it("isn't another Lang's home page, the way in or the first load", () => {
    expect(change("/en", "/ru")).toBe(false)
    expect(change("/en/blog", "/en")).toBe(false)
    expect(change("/en/blog", "/en/gallery")).toBe(false)
    expect(change(undefined, "/en/blog")).toBe(false)
    expect(change("/en", "/en", false)).toBe(false)
  })
})
