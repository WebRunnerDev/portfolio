// The lattice of the Cast Lattice (docs/design-brief.md › Cast Lattice): the
// rhombus cells of the static image (scripts/generate-hero-static.mjs), one
// prism each, in CSS pixels with y down.

// The grid step: the diagonals of each rhombus cell.
export const STEP = 48
export const HALF = STEP / 2
// Rows laid between two yields to the main thread.
const ROWS_PER_SLICE = 8

// A fixed pseudo-random number in [0, 1) for a cell.
export const random = (i: number, j: number) => {
  const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return x - Math.floor(x)
}

// Values per cell in `lattice`: its center x and y, then two fixed random
// numbers: whether a crest or the swell lights it, and how much.
export const CELL = 4

// The cells over a `width` × `height` canvas, one past each edge so the
// lattice bleeds off it, and `reach` pixels more past its sides, which the
// pitched field brings in. Cell centers sit where i + j is odd, between the
// lattice points. Yields every few rows, so a large canvas is laid in slices
// and never holds the main thread for long; returns the cells.
export function* lattice(width: number, height: number, reach = 0) {
  const side = Math.ceil(reach / HALF) + 1
  const columns = Math.ceil(width / HALF) + side
  const rows = Math.ceil(height / HALF) + 1
  const cells: number[] = []
  for (let j = -1; j <= rows; j++) {
    for (let i = -side; i <= columns; i++) {
      if ((i + j) % 2 === 0) continue
      cells.push(i * HALF, j * HALF, random(i, j), random(j, i))
    }
    if (j % ROWS_PER_SLICE === 0) yield
  }
  return new Float32Array(cells)
}

// The pointer's pressure: cells within RADIUS rise by up to LIFT pixels and
// lean away from it, each on a spring of its own.
export const RADIUS = 4 * STEP
export const LIFT = 28
// How far a cell leans per unit of the bump's slope: about 28° at most.
export const LEAN = 2.4
// The spring: its own frequency and damping ratio, a little bounce.
const FREQUENCY_HZ = 2.4
const DAMPING = 0.42
const STIFFNESS = (2 * Math.PI * FREQUENCY_HZ) ** 2
const FRICTION = 2 * DAMPING * 2 * Math.PI * FREQUENCY_HZ
// A frame longer than this (a hidden tab, a jank) steps as this long.
const MAX_STEP_S = 1 / 30
// Crests light this share of the cells: rust stays a few tiles, never a
// fill (DESIGN.md › Colors). A picked cell lights above CREST_ON of the
// full lift and goes out below CREST_OFF, so a pointer at rest leaves whole
// rhombi, not slivers; the rust grows and shrinks over about CREST_MS.
export const CREST_DENSITY = 0.3
const CREST_ON = 0.75
const CREST_OFF = 0.6
const CREST_MS = 120
// Below this, a spring counts as at rest.
const REST = 0.01

// Values per cell in a `Pressure`'s `state`, uploaded as they are: the lift,
// the lean (the top's normal is x, y, 1) and how much of the cell is rust.
export const PRESS = 4

export type Pressure = {
  state: Float32Array
  // Steps every spring by `dt` ms toward the bump under `pointer` (canvas
  // pixels; none: flat). Whether any cell is off its rest.
  step: (pointer: { x: number; y: number } | null, dt: number) => boolean
}

export function pressure(cells: Float32Array): Pressure {
  const count = cells.length / CELL
  const state = new Float32Array(count * PRESS)
  // Lift and lean velocities.
  const velocity = new Float32Array(count * 3)

  let h = 0
  let moving = false
  // One spring, value `k` of cell `c`, a step of `h` toward `target`.
  const spring = (c: number, k: number, target: number) => {
    const s = c * PRESS + k
    const v = c * 3 + k
    velocity[v] +=
      (STIFFNESS * (target - state[s]) - FRICTION * velocity[v]) * h
    state[s] += velocity[v] * h
    if (
      Math.abs(target) > REST ||
      Math.abs(state[s]) > REST ||
      Math.abs(velocity[v]) > REST
    ) {
      moving = true
    }
  }

  const step: Pressure["step"] = (pointer, dt) => {
    h = Math.min(dt / 1000, MAX_STEP_S)
    const fade = 1 - Math.exp((-1000 * h) / CREST_MS)
    moving = false
    for (let c = 0; c < count; c++) {
      let lift = 0
      let leanX = 0
      let leanY = 0
      if (pointer) {
        const dx = cells[c * CELL] - pointer.x
        const dy = cells[c * CELL + 1] - pointer.y
        const u = (dx * dx + dy * dy) / (RADIUS * RADIUS)
        if (u < 1) {
          // A smooth bump, (1 − u)², and its slope away from the pointer.
          const b = 1 - u
          lift = LIFT * b * b
          const slope = (LEAN * 4 * LIFT * b) / (RADIUS * RADIUS)
          leanX = slope * dx
          leanY = slope * dy
        }
      }
      spring(c, 0, lift)
      spring(c, 1, leanX)
      spring(c, 2, leanY)
      const s = c * PRESS
      const lit =
        cells[c * CELL + 2] < CREST_DENSITY &&
        state[s] > (state[s + 3] > 0.5 ? CREST_OFF : CREST_ON) * LIFT
      state[s + 3] += ((lit ? 1 : 0) - state[s + 3]) * fade
      if (state[s + 3] > REST) moving = true
    }
    return moving
  }

  return { state, step }
}
