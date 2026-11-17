// PROTOTYPE, branch spike/path-to-10 only. Points of a chapter's figure
// ("02", "03"…) for its block's dust to settle into: the figure drawn in its
// own font on a 2D canvas the size of its box, then sampled. `edge`: points
// on the outline, each with its outward normal; else points all over the ink.
// Written into `out` from `at`, `count` points of four floats: u, v in the
// box (0–1 from its top left), then the normal on screen (y down).

const SUPER = 2

function lineHeight(style: CSSStyleDeclaration, fontSize: number) {
  const value = style.lineHeight
  if (value.endsWith("px")) return parseFloat(value)
  const number = parseFloat(value)
  return Number.isFinite(number) ? number * fontSize : fontSize * 1.2
}

// The font the figure is drawn in, or null until it has loaded (else the
// points would be a fallback face's).
export function figureFont(figure: Element) {
  const style = getComputedStyle(figure)
  // The first face only: the fallbacks after it may never load (Readex Pro
  // is `ar`'s), and `check` wants them all.
  const first = style.fontFamily.split(",")[0].trim()
  const font = `${style.fontWeight} ${parseFloat(style.fontSize)}px ${first}`
  return document.fonts.check(font) ? style : null
}

export function sampleGlyph(
  figure: Element,
  style: CSSStyleDeclaration,
  text: string,
  edge: boolean,
  out: Float32Array,
  at: number,
  count: number,
  random: () => number
) {
  const box = figure.getBoundingClientRect()
  const w = Math.max(1, Math.ceil(box.width * SUPER))
  const h = Math.max(1, Math.ceil(box.height * SUPER))
  const canvas = new OffscreenCanvas(w, h)
  const g = canvas.getContext("2d", { willReadFrequently: true })
  if (!g) return false
  const fontSize = parseFloat(style.fontSize)
  g.font = `${style.fontWeight} ${fontSize * SUPER}px ${style.fontFamily}`
  const spacing = parseFloat(style.letterSpacing)
  if (Number.isFinite(spacing)) g.letterSpacing = `${spacing * SUPER}px`
  g.fillStyle = "#fff"
  g.textBaseline = "alphabetic"
  const rtl = style.direction === "rtl"
  g.direction = rtl ? "rtl" : "ltr"
  g.textAlign = rtl ? "right" : "left"
  const m = g.measureText(text)
  const ascent = m.fontBoundingBoxAscent
  const descent = m.fontBoundingBoxDescent
  // CSS puts the line's half-leading over the ascent.
  const lh = lineHeight(style, fontSize) * SUPER
  const baseline = (lh - (ascent + descent)) / 2 + ascent
  g.fillText(text, rtl ? w : 0, baseline)

  const alpha = g.getImageData(0, 0, w, h).data
  const ink = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && alpha[(y * w + x) * 4 + 3] > 127
  const picks: number[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!ink(x, y)) continue
      if (
        edge &&
        ink(x - 1, y) &&
        ink(x + 1, y) &&
        ink(x, y - 1) &&
        ink(x, y + 1)
      ) {
        continue
      }
      picks.push(x, y)
    }
  }
  if (!picks.length) return false
  const a = (x: number, y: number) => (ink(x, y) ? 1 : 0)
  for (let i = 0; i < count; i++) {
    const p = Math.floor(random() * (picks.length / 2)) * 2
    const x = picks[p]
    const y = picks[p + 1]
    const o = (at + i) * 4
    out[o] = (x + random()) / w
    out[o + 1] = (y + random()) / h
    if (edge) {
      // Out of the ink: against the gradient of the coverage.
      let nx = 0
      let ny = 0
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const v = a(x + dx, y + dy)
          nx -= dx * v
          ny -= dy * v
        }
      }
      const l = Math.hypot(nx, ny) || 1
      out[o + 2] = nx / l
      out[o + 3] = ny / l
    } else {
      out[o + 2] = 0
      out[o + 3] = 0
    }
  }
  return true
}
