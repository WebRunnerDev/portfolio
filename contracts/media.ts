// Media in R2 (worker/README.md › Media): uploaded through
// POST /api/admin/uploads, served on /media/<key>.

// What an upload may be, with the extension its key gets. The Worker checks
// the file's bytes, not the Content-Type the client declares.
export const MEDIA_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "application/pdf": "pdf",
} as const

export type MediaType = keyof typeof MEDIA_TYPES

export const MEDIA_TYPE_NAMES = Object.keys(MEDIA_TYPES) as MediaType[]

export type MediaKind = "image" | "audio" | "pdf"

export function mediaKind(type: MediaType): MediaKind {
  if (type.startsWith("image/")) return "image"
  if (type.startsWith("audio/")) return "audio"
  return "pdf"
}

const MB = 1024 * 1024

// Larger uploads answer 413. Images stay well under the 70 MB Cloudflare
// Images accepts as a source.
export const MAX_UPLOAD_BYTES: Record<MediaKind, number> = {
  image: 20 * MB,
  audio: 50 * MB,
  pdf: 10 * MB,
}

export function mediaUrl(key: string) {
  return `/media/${key.split("/").map(encodeURIComponent).join("/")}`
}

// srcset widths of a resized image.
export const IMAGE_WIDTHS = [320, 640, 960, 1280, 1920] as const

// The image at `width` through Cloudflare Images (transformations on the
// zone, over /media/*): never upscaled, in the best format the browser takes.
// Only on the zone, so not in `npm run dev`.
export function imageUrl(key: string, width: number) {
  return `/cdn-cgi/image/width=${width},fit=scale-down,format=auto${mediaUrl(key)}`
}

// `srcset` of an image `width` pixels wide (the upload answer has it): the
// widths below it, then the full size, so no candidate claims more pixels
// than it has.
export function imageSrcSet(key: string, width: number) {
  return [...IMAGE_WIDTHS.filter((w) => w < width), width]
    .map((w) => `${imageUrl(key, w)} ${w}w`)
    .join(", ")
}
