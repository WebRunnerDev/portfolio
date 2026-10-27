import { LOGO_TILES } from "@/shared/ui/logo"

// Each tile's center in logo units: its path starts at the top vertex of a
// rhombus 3 units tall.
const centers = LOGO_TILES.map((d) => {
  const [x, y] = d.slice(1).split("L")[0].split(" ").map(Number)
  return { x, y: y + 1.5 }
})

const LOGO_CENTER = 5

// Each tile moved away from the logo's center, `by` times its distance.
export const spread = (by: number) =>
  centers.map(({ x, y }) => ({
    x: (x - LOGO_CENTER) * by,
    y: (y - LOGO_CENTER) * by,
  }))

// Each tile's place in a wave from left to right (tiles in one column share
// it). Not mirrored in RTL: the logo isn't.
const columns = [...new Set(centers.map(({ x }) => x))].sort((a, b) => a - b)
export const waveStep = centers.map(({ x }) => columns.indexOf(x))
