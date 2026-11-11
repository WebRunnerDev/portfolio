// The Cast Lattice's colors (docs/design-brief.md › Cast Lattice), read from
// the DESIGN.md tokens so they follow the theme.
const TOKENS = {
  surface: "--zsd-colors-surface",
  raised: "--zsd-colors-surface-raised",
  edge: "--zsd-colors-outline-muted",
  glint: "--zsd-colors-outline",
  crest: "--zsd-colors-primary",
}

export type Rgb = [number, number, number]

// A token's `#rgb` or `#rrggbb`, or a computed `rgb(r, g, b)`, as 0–1
// channels.
export function rgb(value: string): Rgb {
  const computed = value.match(/^rgba?\(([^)]*)\)/)
  if (computed) {
    const [r, g, b] = computed[1].split(/[\s,/]+/).map(Number)
    return [r / 255, g / 255, b / 255]
  }
  let hex = value.trim().slice(1)
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join("")
  const n = parseInt(hex.slice(0, 6), 16) || 0
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const lightness = ([r, g, b]: Rgb) => r + g + b

export type Palette = {
  // Faces are `surface`, lighter toward the light and darker away from it
  // by `step`: from the darker to the lighter of `surface` and
  // `surface-raised`, whichever the theme makes so.
  surface: Rgb
  step: Rgb
  // Rims `outline-muted`, their glint `outline`, crests `primary`.
  edge: Rgb
  glint: Rgb
  crest: Rgb
}

export function palette(read: (token: string) => string): Palette {
  const surface = rgb(read(TOKENS.surface))
  const raised = rgb(read(TOKENS.raised))
  const sign = lightness(raised) >= lightness(surface) ? 1 : -1
  return {
    surface,
    step: raised.map((c, i) => sign * (c - surface[i])) as Rgb,
    edge: rgb(read(TOKENS.edge)),
    glint: rgb(read(TOKENS.glint)),
    crest: rgb(read(TOKENS.crest)),
  }
}
