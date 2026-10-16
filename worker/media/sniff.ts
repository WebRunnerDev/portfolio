import type { MediaType } from "@contracts/media"

// What an upload really is, from its first bytes, and an image's size. A
// file that matches no MEDIA_TYPES entry (or an image whose size can't be
// read) is undefined: the upload answers 415.
export type Sniffed = { type: MediaType; width?: number; height?: number }

function ascii(bytes: Uint8Array, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false
  }
  return true
}

export function sniffMedia(bytes: Uint8Array): Sniffed | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  try {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return image("image/jpeg", jpegSize(bytes, view))
    }
    if (ascii(bytes, 0, "\x89PNG\r\n\x1a\n") && ascii(bytes, 12, "IHDR")) {
      return image("image/png", {
        width: view.getUint32(16),
        height: view.getUint32(20),
      })
    }
    if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) {
      return image("image/webp", webpSize(bytes, view))
    }
    if (ascii(bytes, 0, "%PDF-")) return { type: "application/pdf" }
    if (ascii(bytes, 0, "OggS")) return { type: "audio/ogg" }
    if (isM4a(bytes, view)) return { type: "audio/mp4" }
    if (isMp3(bytes)) return { type: "audio/mpeg" }
  } catch {
    // A truncated header reads past the end: not a usable file.
  }
  return undefined
}

type Size = { width: number; height: number }

function image(type: MediaType, size: Size | undefined) {
  if (!size || size.width < 1 || size.height < 1) return undefined
  return { type, ...size }
}

// Start-of-frame markers (C0–CF but DHT, JPG and DAC) carry the size.
function isSof(marker: number) {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  )
}

function jpegSize(bytes: Uint8Array, view: DataView): Size | undefined {
  let rotated = false
  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return undefined
    const marker = bytes[offset + 1]
    // Fill bytes and markers without a length.
    if (marker === 0xff) {
      offset++
      continue
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2
      continue
    }
    const length = view.getUint16(offset + 2)
    if (marker === 0xe1 && ascii(bytes, offset + 4, "Exif\0\0")) {
      rotated = exifRotated(view, offset + 10)
    }
    if (isSof(marker)) {
      const height = view.getUint16(offset + 5)
      const width = view.getUint16(offset + 7)
      return rotated ? { width: height, height: width } : { width, height }
    }
    offset += 2 + length
  }
  return undefined
}

// EXIF orientations 5–8 turn the image a quarter, so browsers show it with
// width and height swapped.
function exifRotated(view: DataView, tiff: number) {
  const little = view.getUint16(tiff) === 0x4949
  const ifd = tiff + view.getUint32(tiff + 4, little)
  const count = view.getUint16(ifd, little)
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12
    if (view.getUint16(entry, little) === 0x0112) {
      return view.getUint16(entry + 8, little) >= 5
    }
  }
  return false
}

function webpSize(bytes: Uint8Array, view: DataView): Size | undefined {
  // Lossy.
  if (ascii(bytes, 12, "VP8 ")) {
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    }
  }
  // Lossless: 14-bit width and height minus one, packed after the signature.
  if (ascii(bytes, 12, "VP8L")) {
    const bits = view.getUint32(21, true)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  // Extended: 24-bit canvas width and height minus one.
  if (ascii(bytes, 12, "VP8X")) {
    const uint24 = (at: number) =>
      view.getUint16(at, true) | (view.getUint8(at + 2) << 16)
    return { width: uint24(24) + 1, height: uint24(27) + 1 }
  }
  return undefined
}

// An MP4 container is audio when its `ftyp` box names an M4A brand.
function isM4a(bytes: Uint8Array, view: DataView) {
  if (!ascii(bytes, 4, "ftyp")) return false
  const end = Math.min(view.getUint32(0), bytes.length)
  for (let at = 8; at + 4 <= end; at += 4) {
    if (at === 12) continue // minor version
    if (ascii(bytes, at, "M4A ")) return true
  }
  return false
}

// An ID3 tag, or straight away an MPEG audio frame (Layer I–III, which rules
// out AAC's ADTS sync word).
function isMp3(bytes: Uint8Array) {
  if (ascii(bytes, 0, "ID3")) return true
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 6) !== 0
}
