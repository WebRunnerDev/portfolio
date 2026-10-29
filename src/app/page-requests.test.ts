import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { pageRequests } from "@contracts/page-requests"
import { loadProject } from "@/pages/project"
import { loadAlbum } from "@/pages/album"
import { loadAlbums } from "@/pages/gallery"
import { loadCv } from "@/pages/cv"
import { loadHome } from "@/pages/home"
import { loadPost, loadPosts } from "@/pages/blog"
import { loadProjects } from "@/pages/projects"

// The Worker preloads `pageRequests` with each page (#142); a preload the
// loader doesn't ask for exactly is wasted, a request missing from it waits
// for the app's code. Each loader runs against a fetch that records the
// paths and answers nothing usable.
let requested: string[] = []

beforeEach(() => {
  requested = []
  vi.stubGlobal("fetch", async (url: string) => {
    requested.push(url.replace(/^\/api\/public\/en\//, ""))
    return new Response("null", { status: 500 })
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const signal = new AbortController().signal

async function settle(load: () => unknown) {
  const result = await Promise.resolve()
    .then(load)
    .catch(() => null)
  if (result && typeof result === "object") {
    await Promise.allSettled(Object.values(result))
  }
}

describe("pageRequests", () => {
  it.each<[string, () => unknown]>([
    ["", () => loadHome("en", signal)],
    ["cv", () => loadCv("en", signal)],
    ["cv/print", () => loadCv("en", signal, "print")],
    ["projects", () => loadProjects("en", signal)],
    [
      "projects/edge-portfolio",
      () => loadProject("en", "edge-portfolio", signal),
    ],
    ["gallery", () => loadAlbums("en", signal)],
    ["gallery/astana", () => loadAlbum("en", "astana", signal)],
    ["blog", () => loadPosts("en", undefined, signal)],
    ["blog/edge-caching", () => loadPost("en", "edge-caching", signal)],
    ["blog/caf%C3%A9", () => loadPost("en", "café", signal)],
  ])("lists what the loader of /en/%s asks", async (path, load) => {
    await settle(load)
    expect(pageRequests(path, new URLSearchParams()).sort()).toEqual(
      requested.sort()
    )
  })

  it("preloads nothing for a filtered Blog or an unknown path", () => {
    expect(pageRequests("blog", new URLSearchParams("tag=testing"))).toEqual([])
    expect(pageRequests("nowhere", new URLSearchParams())).toEqual([])
    expect(pageRequests("blog/a/b", new URLSearchParams())).toEqual([])
    expect(pageRequests("blog/%E0", new URLSearchParams())).toEqual([])
  })
})
