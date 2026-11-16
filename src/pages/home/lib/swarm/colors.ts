// The Swarm's colors (ADR-0013 › Темы), read from the DESIGN.md tokens so
// they follow the theme.
const TOKENS = {
  surface: "--zsd-colors-surface",
  outline: "--zsd-colors-outline",
  outlineMuted: "--zsd-colors-outline-muted",
  primary: "--zsd-colors-primary",
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

// sRGB to linear light, which the scene shades in.
const linear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const toLinear = (c: Rgb) => c.map(linear) as Rgb

const lightness = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b

export type Palette = {
  // The page under the scene, as is (sRGB): the canvas shows it wherever
  // the scene draws nothing, so it never differs from the page around it.
  surface: Rgb
  dark: boolean
  // Dust lit by the key light and its rim (linear): cold steel in the dark
  // theme as in the spike, darker than the page in the light one.
  steel: Rgb
  rim: Rgb
  // What a hot particle flashes and a packet's head is (linear): rust.
  flash: Rgb
  // A cold thread (linear): the spike's dark steel, added to the scene in
  // the dark; `outline` in the light, blended over it.
  line: Rgb
}

// The spike's steel and rim in the dark. In the light, `outline` lit and
// `outline-muted` at the rim: grey grains a shade under the text, their
// edges fading toward the page.
const DARK_STEEL: Rgb = [0.6, 0.64, 0.72]
const DARK_RIM: Rgb = [0.5, 0.58, 0.78]
// The spike's rust, brighter than `primary`: in the dark it is light, and
// tone mapping takes it to `primary`'s hue. In the light, `primary` itself.
const DARK_FLASH: Rgb = [1, 0.36, 0.12]
const DARK_LINE: Rgb = [0.1, 0.112, 0.135]

export function palette(read: (token: string) => string): Palette {
  const surface = rgb(read(TOKENS.surface))
  const dark = lightness(surface) < 0.5
  return {
    surface,
    dark,
    steel: dark ? DARK_STEEL : toLinear(rgb(read(TOKENS.outline))),
    rim: dark ? DARK_RIM : toLinear(rgb(read(TOKENS.outlineMuted))),
    flash: dark ? DARK_FLASH : toLinear(rgb(read(TOKENS.primary))),
    line: dark ? DARK_LINE : toLinear(rgb(read(TOKENS.outline))),
  }
}
