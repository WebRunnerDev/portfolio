import { describe, expect, it } from "vitest"
import * as files from "../test/media-fixtures"
import { sniffMedia } from "./sniff"

describe("sniffMedia", () => {
  it("reads the size of PNG, JPEG and every WebP flavour", () => {
    expect(sniffMedia(files.png(800, 600))).toEqual({
      type: "image/png",
      width: 800,
      height: 600,
    })
    expect(sniffMedia(files.jpeg(4032, 3024))).toEqual({
      type: "image/jpeg",
      width: 4032,
      height: 3024,
    })
    for (const webp of [
      files.webpLossy(640, 480),
      files.webpLossless(640, 480),
      files.webpExtended(640, 480),
    ]) {
      expect(sniffMedia(webp)).toEqual({
        type: "image/webp",
        width: 640,
        height: 480,
      })
    }
  })

  it("swaps a JPEG's size when EXIF turns it a quarter", () => {
    expect(sniffMedia(files.jpeg(4032, 3024, 6))).toMatchObject({
      width: 3024,
      height: 4032,
    })
    expect(sniffMedia(files.jpeg(4032, 3024, 3))).toMatchObject({
      width: 4032,
      height: 3024,
    })
  })

  it("recognises audio and PDF", () => {
    expect(sniffMedia(files.mp3WithId3())).toEqual({ type: "audio/mpeg" })
    expect(sniffMedia(files.mp3Frame())).toEqual({ type: "audio/mpeg" })
    expect(sniffMedia(files.ogg())).toEqual({ type: "audio/ogg" })
    expect(sniffMedia(files.mp4("M4A ", "isom"))).toEqual({ type: "audio/mp4" })
    expect(sniffMedia(files.mp4("mp42", "isom", "M4A "))).toEqual({
      type: "audio/mp4",
    })
    expect(sniffMedia(files.pdf())).toEqual({ type: "application/pdf" })
  })

  it("rejects everything else", () => {
    for (const file of [
      files.svg(),
      files.gif(),
      files.aacAdts(),
      files.mp4("isom", "mp42"),
      new TextEncoder().encode("hello"),
      new Uint8Array(),
      // Truncated headers.
      files.png(800, 600).slice(0, 18),
      files.jpeg(800, 600).slice(0, 30),
      // A size of zero.
      files.png(0, 600),
    ]) {
      expect(sniffMedia(file)).toBeUndefined()
    }
  })
})
