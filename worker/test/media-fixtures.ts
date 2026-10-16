// The smallest headers the sniffer (worker/media/sniff.ts) recognises, with
// some padding standing in for the rest of the file.

function bytes(...parts: (string | number[])[]) {
  const out: number[] = []
  for (const part of parts) {
    if (typeof part === "string") {
      for (const char of part) out.push(char.charCodeAt(0))
    } else out.push(...part)
  }
  return new Uint8Array(out)
}

const u16 = (n: number) => [n >> 8, n & 0xff]
const u32 = (n: number) => [
  n >>> 24,
  (n >> 16) & 0xff,
  (n >> 8) & 0xff,
  n & 0xff,
]
const u16le = (n: number) => [n & 0xff, n >> 8]
const u24le = (n: number) => [n & 0xff, (n >> 8) & 0xff, n >> 16]

const padding = (length = 64) => new Array<number>(length).fill(0)

export function png(width: number, height: number) {
  return bytes(
    "\x89PNG\r\n\x1a\n",
    u32(13),
    "IHDR",
    u32(width),
    u32(height),
    [8, 2, 0, 0, 0],
    padding()
  )
}

// A JPEG `width`×`height` as stored; `orientation` goes into an EXIF block.
export function jpeg(width: number, height: number, orientation?: number) {
  const exif =
    orientation === undefined
      ? []
      : [
          0xff,
          0xe1,
          ...u16(2 + 6 + 8 + 2 + 12 + 4),
          ...bytes("Exif\0\0", "MM", u16(42), u32(8)),
          ...u16(1),
          ...u16(0x0112),
          ...u16(3),
          ...u32(1),
          ...u16(orientation),
          0,
          0,
          ...u32(0),
        ]
  return bytes(
    [0xff, 0xd8],
    [0xff, 0xe0, ...u16(16)],
    "JFIF\0",
    padding(9),
    exif,
    [0xff, 0xdb, ...u16(3), 0],
    [0xff, 0xc0, ...u16(17), 8, ...u16(height), ...u16(width), 3],
    padding(9),
    [0xff, 0xd9]
  )
}

export function webpLossy(width: number, height: number) {
  return bytes(
    "RIFF",
    u32(0),
    "WEBP",
    "VP8 ",
    u32(0),
    [0, 0, 0, 0x9d, 0x01, 0x2a],
    u16le(width),
    u16le(height),
    padding()
  )
}

export function webpLossless(width: number, height: number) {
  const bits = (width - 1) | ((height - 1) << 14)
  return bytes(
    "RIFF",
    u32(0),
    "WEBP",
    "VP8L",
    u32(0),
    [0x2f],
    [bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, bits >>> 24],
    padding()
  )
}

export function webpExtended(width: number, height: number) {
  return bytes(
    "RIFF",
    u32(0),
    "WEBP",
    "VP8X",
    u32(10),
    padding(4),
    u24le(width - 1),
    u24le(height - 1),
    padding()
  )
}

export function mp4(...brands: string[]) {
  return bytes(
    u32(8 + 4 * brands.length + 4),
    "ftyp",
    brands[0],
    u32(0),
    ...brands.slice(1),
    padding()
  )
}

export const pdf = () => bytes("%PDF-1.7\n", padding())
export const ogg = () => bytes("OggS", padding())
export const mp3WithId3 = () => bytes("ID3", [4, 0, 0], padding())
export const mp3Frame = () => bytes([0xff, 0xfb, 0x90, 0x64], padding())
export const aacAdts = () => bytes([0xff, 0xf1, 0x50, 0x80], padding())
export const svg = () => bytes('<svg xmlns="http://www.w3.org/2000/svg"/>')
export const gif = () => bytes("GIF89a", u16le(10), u16le(10), padding())

// `length` bytes counting 0, 1, 2… so slices are easy to check.
export function counting(length: number) {
  return Uint8Array.from({ length }, (_, i) => i % 256)
}
