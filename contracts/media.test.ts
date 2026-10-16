import { describe, expect, it } from "vitest"
import { imageSrcSet, imageUrl, mediaKind, mediaUrl } from "./media"

const KEY = "image/0b5c3f4e-2d7a-4f43-9a51-8f6f0e2d1c3b.jpg"

describe("media URLs", () => {
  it("serves a key under /media, segment by segment encoded", () => {
    expect(mediaUrl(KEY)).toBe(`/media/${KEY}`)
    expect(mediaUrl("cv/en ru.pdf")).toBe("/media/cv/en%20ru.pdf")
  })

  it("resizes through Cloudflare Images", () => {
    expect(imageUrl(KEY, 640)).toBe(
      `/cdn-cgi/image/width=640,fit=scale-down,format=auto/media/${KEY}`
    )
  })

  it("lists widths below the original, then the original", () => {
    const candidates = imageSrcSet(KEY, 1000).split(", ")
    expect(candidates.map((c) => c.split(" ")[1])).toEqual([
      "320w",
      "640w",
      "960w",
      "1000w",
    ])
    expect(candidates[0]).toBe(`${imageUrl(KEY, 320)} 320w`)
  })

  it("has a single candidate for a small image", () => {
    expect(imageSrcSet(KEY, 200)).toBe(`${imageUrl(KEY, 200)} 200w`)
  })

  it("groups types into kinds", () => {
    expect(mediaKind("image/webp")).toBe("image")
    expect(mediaKind("audio/ogg")).toBe("audio")
    expect(mediaKind("application/pdf")).toBe("pdf")
  })
})
