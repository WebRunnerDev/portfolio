import { centers } from "../tiles"
import { BLOCKS } from "./shaders"
import { clamp, lerp, rng } from "./math"

// docs/design-brief.md › Главная на Swarm › Сцена › Сеть: the hero's web.
// Nodes 0–6 are the logo's blocks; the far nodes after them are small
// rhombi deep behind the page, laid once when the scene starts.

export const Kind = {
  // A far node to one of its three nearest.
  Web: 0,
  // Between two blocks of the logo.
  Logo: 1,
  // A block to the far nodes nearest to it.
  Attach: 2,
} as const
export type Kind = (typeof Kind)[keyof typeof Kind]

export type FarNode = {
  // Where it sits in the hero, 0–1 of its box (a little over the edges).
  u: number
  v: number
  // Its depth behind the page's plane (negative), size and turn.
  z: number
  size: number
  rx: number
  ry: number
  spin: number
}

export type Edge = {
  a: number
  b: number
  kind: Kind
  // How warm the thread stands once both its ends are lit.
  base: number
  // Its width in world units.
  width: number
}

export type Web = {
  // Blocks and far nodes.
  nodes: number
  far: FarNode[]
  edges: Edge[]
  // The threads at node n: list[start[n]] to list[start[n + 1]] (exclusive).
  start: Int32Array
  list: Int32Array
}

// What the hero looks like when the web is laid, in CSS pixels from its
// top left: its size, the logo's square and the boxes of its text.
export type HeroFrame = {
  width: number
  height: number
  logo: Rect
  text: Rect[]
}
export type Rect = { left: number; top: number; right: number; bottom: number }

// Far nodes in the hero at the `desktop` level (the spike's 50).
export const HERO_NODES = 50
// Over the hero's edges a little, so the web doesn't end at them.
const OVER = 0.05
// Clear of the text by this much (CSS pixels).
const TEXT_MARGIN = 24
// Around the logo only a few: its own threads are there.
const LOGO_AROUND = 0.25
const LOGO_KEEP = 0.15
// Blocks closer than this (logo units) share a thread.
const LOGO_THREAD = 4.3

const inside = (r: Rect, x: number, y: number, margin = 0) =>
  x > r.left - margin &&
  x < r.right + margin &&
  y > r.top - margin &&
  y < r.bottom + margin

// Block i's center in the hero (CSS pixels), as the logo lays its tiles.
export function blockCenter(logo: Rect, i: number) {
  const size = Math.min(logo.right - logo.left, logo.bottom - logo.top)
  return {
    x: (logo.left + logo.right) / 2 + ((centers[i].x - 5) / 10) * size,
    y: (logo.top + logo.bottom) / 2 + ((centers[i].y - 5) / 10) * size,
  }
}

// The hero's web for `frame`, `count` far nodes at most: the same on every
// visit at the same size. Far nodes keep a minimum distance and stay out of
// the text; each threads to its three nearest, the blocks to each other
// (the logo's own threads) and each block to the two far nodes nearest it.
export function heroWeb(frame: HeroFrame, count = HERO_NODES): Web {
  const random = rng(7)
  const { width: w, height: h, logo } = frame
  const lx = (logo.left + logo.right) / 2
  const ly = (logo.top + logo.bottom) / 2
  const around = (logo.right - logo.left) * (0.5 + LOGO_AROUND)
  const minD = Math.sqrt((w * h * (1 + 2 * OVER) ** 2) / count) * 0.62
  const far: FarNode[] = []
  const px: number[] = []
  const py: number[] = []
  for (let tries = 0; far.length < count && tries < 4000; tries++) {
    const u = lerp(-OVER, 1 + OVER, random())
    const v = lerp(-OVER, 1 + OVER, random())
    const x = u * w
    const y = v * h
    if (frame.text.some((r) => inside(r, x, y, TEXT_MARGIN))) continue
    const nearLogo = Math.abs(x - lx) < around && Math.abs(y - ly) < around
    if (nearLogo && random() > LOGO_KEEP) continue
    let ok = true
    for (let k = 0; k < px.length && ok; k++) {
      ok = Math.hypot(px[k] - x, py[k] - y) >= minD
    }
    if (!ok) continue
    // Deeper the further from the logo.
    const r = Math.hypot(((x - lx) / w) * 1.4, (y - ly) / h)
    far.push({
      u,
      v,
      z: -2.6 - random() * 11 * clamp(0.4 + r, 0, 1),
      size: 0.1 + random() * 0.14,
      rx: random() * 0.6 - 0.3,
      ry: random() * 0.8,
      spin: (random() - 0.5) * 0.3,
    })
    px.push(x)
    py.push(y)
  }

  const edges: Edge[] = []
  const seen = new Set<number>()
  const nodes = BLOCKS + far.length
  const add = (
    a: number,
    b: number,
    kind: Kind,
    base: number,
    width: number
  ) => {
    const key = Math.min(a, b) * nodes + Math.max(a, b)
    if (a === b || seen.has(key)) return
    seen.add(key)
    edges.push({ a, b, kind, base, width })
  }
  // The far nodes nearest to (x, y), `k` of them, but `self`.
  const nearest = (x: number, y: number, k: number, self = -1) =>
    px
      .map((fx, j) => [Math.hypot(fx - x, py[j] - y), j] as const)
      .filter(([, j]) => j !== self)
      .sort((p, q) => p[0] - q[0])
      .slice(0, k)
      .map(([, j]) => BLOCKS + j)

  for (let j = 0; j < far.length; j++) {
    for (const o of nearest(px[j], py[j], 3, j)) {
      add(BLOCKS + j, o, Kind.Web, 0.03, 0.018)
    }
  }
  for (let i = 0; i < BLOCKS; i++) {
    for (let j = i + 1; j < BLOCKS; j++) {
      const d = Math.hypot(
        centers[i].x - centers[j].x,
        centers[i].y - centers[j].y
      )
      if (d < LOGO_THREAD) add(i, j, Kind.Logo, 0.5, 0.075)
    }
  }
  for (let i = 0; i < BLOCKS; i++) {
    const c = blockCenter(logo, i)
    for (const o of nearest(c.x, c.y, 2)) add(i, o, Kind.Attach, 0.1, 0.026)
  }

  // Each node's threads, flat.
  const start = new Int32Array(nodes + 1)
  for (const e of edges) {
    start[e.a + 1]++
    start[e.b + 1]++
  }
  for (let n = 0; n < nodes; n++) start[n + 1] += start[n]
  const list = new Int32Array(edges.length * 2)
  const fill = start.slice(0, nodes)
  edges.forEach((e, i) => {
    list[fill[e.a]++] = i
    list[fill[e.b]++] = i
  })
  return { nodes, far, edges, start, list }
}

// The node at the other end of edge `e` from `n`.
export const other = (e: Edge, n: number) => (e.a === n ? e.b : e.a)
