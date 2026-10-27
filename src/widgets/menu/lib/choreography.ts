import { DURATION, EASE, STAGGER } from "@/shared/lib/motion"
import { LOGO_TILES, type TilePlacement } from "@/shared/ui/logo"

// The menu's choreography (DESIGN.md › Motion), in seconds. Opening: the logo
// tiles leave the header logo and spread over the screen (`duration-slow`,
// `easing-layout`), the inner ones first; the rows rise from under their mask
// after them, `stagger-item` apart, by `choreography-max`. Closing runs it
// backwards and faster: the rows drop, the tiles fold into the logo, the
// surface fades over the header, whose logo stands in the same place.
export const OPEN = {
  tiles: DURATION.slow,
  tileStagger: STAGGER.word,
  rowsStart: DURATION.base,
  rowStagger: STAGGER.item,
} as const

export const CLOSE = {
  tilesDelay: DURATION.fast / 2,
  tiles: DURATION.base,
} as const

// The surface fades once the tiles are back in the logo.
export const FOLD_END = CLOSE.tilesDelay + CLOSE.tiles

// When row `i` (a link, then the controls) starts to rise; it rises in
// `duration-slow` and drops in `duration-fast` (index.css › menu-row-*).
export const rowDelay = (i: number) => OPEN.rowsStart + i * OPEN.rowStagger

const bezier = (curve: readonly number[]) => `cubic-bezier(${curve.join(", ")})`

export const TILE_EASING = bezier(EASE.layout)

// Spread tiles stay faint behind the menu: `on-surface` at this opacity keeps
// muted text over them above 4.5:1 in both modes.
export const TILES_OPACITY = 0.1

// How far a tile moves away from the logo's center, as a share of its own
// distance from it (logo units, the viewBox is 10 × 10).
const SPREAD = 0.5

// A tile's path starts at its top corner; its center is 1.5 below.
const center = (d: string) => {
  const [x, y] = d.slice(1).split("L")[0].split(" ").map(Number)
  return { x, y: y + 1.5 }
}

const distance = ({ x, y }: { x: number; y: number }) =>
  Math.hypot(x - 5, y - 5)

// Tiles at the same distance from the center move together, inner first.
const distances = LOGO_TILES.map((d) => distance(center(d)))
const rings = [...new Set(distances.map((r) => r.toFixed(1)))].sort(
  (a, b) => Number(a) - Number(b)
)

export const SPREAD_TILES: (TilePlacement & { ring: number })[] =
  LOGO_TILES.map((d, i) => {
    const { x, y } = center(d)
    return {
      x: (x - 5) * SPREAD,
      y: (y - 5) * SPREAD,
      ring: rings.indexOf(distances[i].toFixed(1)),
    }
  })

export const translate = ({ x = 0, y = 0 }: TilePlacement) =>
  `translate(${x}px, ${y}px)`
