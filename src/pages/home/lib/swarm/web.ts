import { centers } from "../tiles"
import { BLOCKS } from "./shaders"
import { clamp, lerp, rng } from "./math"

// docs/design-brief.md › Главная на Swarm › Сцена › Сеть: the page's web.
// Nodes 0–6 are the logo's blocks; the far nodes after them are small
// rhombi deep behind the page, laid once when the scene starts, in groups:
// the hero's web, one for each chapter and the footer's.

export const Kind = {
  // A far node to one of its three nearest in its group.
  Web: 0,
  // Between two blocks of the logo.
  Logo: 1,
  // A block to the far nodes nearest to it in a group.
  Attach: 2,
  // The one thread from the logo down to the chapters' blocks, block to
  // block: the crawler comes down it into a chapter.
  Chain: 3,
  // A long thread from one group to the next, so the web runs down the
  // whole page.
  Link: 4,
} as const
export type Kind = (typeof Kind)[keyof typeof Kind]

// The groups, in the page's order: the hero (and the blocks), the
// chapters (Резюме, Проекты, Галерея, Блог, those shown), the footer.
export const HERO = 0
export const CHAPTERS = 4
export const FOOTER = CHAPTERS + 1
export const chapter = (slot: number) => 1 + slot

// The block each chapter shown takes, in their order, and the chain from
// the block that stays in the logo through them: neighbours in the logo,
// so before they leave the chain is the logo's own threads.
export const CHAPTER_BLOCKS = [0, 1, 2, 3] as const
export const CHAIN = [6, ...CHAPTER_BLOCKS] as const

export type FarNode = {
  group: number
  // Where it sits in its part of the page, 0–1 of its box (a little over
  // the edges).
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
  // Per node, its group (the blocks: the hero's).
  group: Int8Array
  // The blocks and the hero's far nodes: what the hero's crawl lights.
  heroNodes: number
  // The chain's threads, one per chapter slot.
  chain: number[]
  // The threads at node n: list[start[n]] to list[start[n + 1]] (exclusive).
  start: Int32Array
  list: Int32Array
}

export type Rect = { left: number; top: number; right: number; bottom: number }

// A part of the page when the web is laid, in CSS pixels from its top
// left: its size, the square its blocks stand in (the hero's and the
// footer's logo, a chapter's rail) and the boxes of its text.
export type Frame = {
  width: number
  height: number
  logo: Rect
  text: Rect[]
}
// The hero's frame keeps its own name: it is the one the scene starts in.
export type HeroFrame = Frame

// The whole page: the viewport, the hero, the chapters shown (in order;
// null for a slot no chapter takes yet) and the footer (null without one).
export type PageFrame = {
  view: { width: number; height: number }
  hero: Frame
  chapters: (Frame | null)[]
  footer: Frame | null
}

// Far nodes per group at the `desktop` level (the spike's counts).
export const HERO_NODES = 50
export const CHAPTER_NODES = 26
export const FOOTER_NODES = 36
// Over the box's edges a little, so the web doesn't end at them.
const OVER = 0.05
// Clear of the text by this much (CSS pixels).
const TEXT_MARGIN = 24
// Around a logo only a few: its own threads are there.
const LOGO_AROUND = 0.25
const LOGO_KEEP = 0.15
// Blocks closer than this (logo units) share a thread.
const LOGO_THREAD = 4.3
// Long threads between two groups: one in each share of the width.
const LINKS = 3

const inside = (r: Rect, x: number, y: number, margin = 0) =>
  x > r.left - margin &&
  x < r.right + margin &&
  y > r.top - margin &&
  y < r.bottom + margin

// Block i's center in a logo's square (CSS pixels), as the logo lays its
// tiles.
export function blockCenter(logo: Rect, i: number) {
  const size = Math.min(logo.right - logo.left, logo.bottom - logo.top)
  return {
    x: (logo.left + logo.right) / 2 + ((centers[i].x - 5) / 10) * size,
    y: (logo.top + logo.bottom) / 2 + ((centers[i].y - 5) / 10) * size,
  }
}

// A chapter no section stands for yet (its data comes later): a frame the
// size of the viewport with its text across the content, so the web lies
// at the edges and above it.
const someChapter = ({ width, height }: PageFrame["view"]): Frame => ({
  width,
  height,
  logo: { left: 0, top: 0, right: 0, bottom: 0 },
  text: [
    {
      left: width * 0.08,
      top: height * 0.12,
      right: width * 0.92,
      bottom: height,
    },
  ],
})

// The page's web for `frame`, `share` of the far nodes at `desktop`: the
// same on every visit at the same size. In each group far nodes keep a
// minimum distance and stay out of the text, deeper the further from its
// square; each threads to its three nearest there. The blocks thread to
// each other (the logo's own threads, the chain among them), to the two
// far nodes nearest each in the hero and the footer, and a chapter's block
// to the four nearest its rail; each group to the next by a few long
// threads across the width.
export function pageWeb(frame: PageFrame, share = 1): Web {
  const random = rng(7)
  const far: FarNode[] = []
  // Per far node, its place in its frame (CSS pixels).
  const px: number[] = []
  const py: number[] = []

  // `count` far nodes in `f` for group `group`; depth by the distance to
  // its square over `norm`.
  function lay(group: number, f: Frame, count: number, norm: Frame["logo"]) {
    const { width: w, height: h, logo } = f
    const lx = (logo.left + logo.right) / 2
    const ly = (logo.top + logo.bottom) / 2
    const around = (logo.right - logo.left) * (0.5 + LOGO_AROUND)
    const minD = Math.sqrt((w * h * (1 + 2 * OVER) ** 2) / count) * 0.62
    const first = far.length
    const nw = norm.right - norm.left
    const nh = norm.bottom - norm.top
    for (let tries = 0; far.length - first < count && tries < 4000; tries++) {
      const u = lerp(-OVER, 1 + OVER, random())
      const v = lerp(-OVER, 1 + OVER, random())
      const x = u * w
      const y = v * h
      if (f.text.some((r) => inside(r, x, y, TEXT_MARGIN))) continue
      const nearLogo = Math.abs(x - lx) < around && Math.abs(y - ly) < around
      if (nearLogo && random() > LOGO_KEEP) continue
      let ok = true
      for (let k = first; k < px.length && ok; k++) {
        ok = Math.hypot(px[k] - x, py[k] - y) >= minD
      }
      if (!ok) continue
      // Deeper the further from its square.
      const r = Math.hypot(((x - lx) / nw) * 1.4, (y - ly) / nh)
      far.push({
        group,
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
  }

  const { view } = frame
  const byView = { left: 0, top: 0, right: view.width, bottom: view.height }
  const hero = frame.hero
  lay(HERO, hero, Math.round(HERO_NODES * share), {
    left: 0,
    top: 0,
    right: hero.width,
    bottom: hero.height,
  })
  const chapters = Array.from(
    { length: CHAPTERS },
    (_, s) => frame.chapters[s] ?? someChapter(view)
  )
  chapters.forEach((f, s) =>
    lay(chapter(s), f, Math.round(CHAPTER_NODES * share), byView)
  )
  if (frame.footer) {
    lay(FOOTER, frame.footer, Math.round(FOOTER_NODES * share), byView)
  }

  const nodes = BLOCKS + far.length
  const group = new Int8Array(nodes)
  far.forEach((f, j) => (group[BLOCKS + j] = f.group))
  const members = (g: number) =>
    far.flatMap((f, j) => (f.group === g ? [j] : []))

  const edges: Edge[] = []
  const seen = new Map<number, number>()
  const add = (
    a: number,
    b: number,
    kind: Kind,
    base: number,
    width: number
  ) => {
    const key = Math.min(a, b) * nodes + Math.max(a, b)
    if (a === b) return -1
    const known = seen.get(key)
    if (known !== undefined) return known
    seen.set(key, edges.length)
    edges.push({ a, b, kind, base, width })
    return edges.length - 1
  }
  // The far nodes of `pool` nearest to (x, y), `k` of them, but `self`.
  const nearest = (
    pool: number[],
    x: number,
    y: number,
    k: number,
    self = -1
  ) =>
    pool
      .filter((j) => j !== self)
      .map((j) => [Math.hypot(px[j] - x, py[j] - y), j] as const)
      .sort((p, q) => p[0] - q[0])
      .slice(0, k)
      .map(([, j]) => BLOCKS + j)

  const groups = Array.from({ length: FOOTER + 1 }, (_, g) => members(g))
  for (const pool of groups) {
    for (const j of pool) {
      for (const o of nearest(pool, px[j], py[j], 3, j)) {
        add(BLOCKS + j, o, Kind.Web, 0.03, 0.018)
      }
    }
  }
  const chain = CHAPTER_BLOCKS.map((b, s) =>
    add(CHAIN[s], b, Kind.Chain, 0.42, 0.06)
  )
  for (let i = 0; i < BLOCKS; i++) {
    for (let j = i + 1; j < BLOCKS; j++) {
      const d = Math.hypot(
        centers[i].x - centers[j].x,
        centers[i].y - centers[j].y
      )
      if (d < LOGO_THREAD) add(i, j, Kind.Logo, 0.5, 0.075)
    }
  }
  const attach = (
    i: number,
    pool: number[],
    x: number,
    y: number,
    k: number
  ) => {
    for (const o of nearest(pool, x, y, k)) add(i, o, Kind.Attach, 0.1, 0.026)
  }
  for (let i = 0; i < BLOCKS; i++) {
    const c = blockCenter(hero.logo, i)
    attach(i, groups[HERO], c.x, c.y, 2)
  }
  chapters.forEach((f, s) => {
    const rail = f.logo
    attach(
      CHAPTER_BLOCKS[s],
      groups[chapter(s)],
      (rail.left + rail.right) / 2,
      (rail.top + rail.bottom) / 2,
      4
    )
  })
  if (frame.footer) {
    for (let i = 0; i < BLOCKS; i++) {
      const c = blockCenter(frame.footer.logo, i)
      attach(i, groups[FOOTER], c.x, c.y, 2)
    }
  }

  // Long threads from the bottom of group `g` to the top of `h`: in each
  // share of the width, the lowest node of one to the highest of the
  // other, so they don't bundle at an edge.
  const link = (g: number, h: number) => {
    for (let k = 0; k < LINKS; k++) {
      const band = (j: number) => {
        const u = clamp(far[j].u, 0, 0.999)
        return Math.floor(u * LINKS) === k
      }
      const lower = groups[g].filter(band)
      const upper = groups[h].filter(band)
      if (!lower.length || !upper.length) continue
      const a = lower.reduce((p, q) => (far[q].v > far[p].v ? q : p))
      const b = upper.reduce((p, q) => (far[q].v < far[p].v ? q : p))
      add(BLOCKS + a, BLOCKS + b, Kind.Link, 0.03, 0.018)
    }
  }
  // The chapters shown are always the first slots: from the hero to each,
  // each to the next, and from the hero and each to the footer, for the
  // last one shown (`linkShows`).
  link(HERO, chapter(0))
  for (let s = 0; s < CHAPTERS - 1; s++) link(chapter(s), chapter(s + 1))
  if (frame.footer) {
    link(HERO, FOOTER)
    for (let s = 0; s < CHAPTERS; s++) link(chapter(s), FOOTER)
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
  return {
    nodes,
    far,
    edges,
    group,
    heroNodes: BLOCKS + groups[HERO].length,
    chain,
    start,
    list,
  }
}

// Whether a long thread from group `g` to `h` shows when `shown` groups
// are on the page: both are, and none between them.
export function linkShows(g: number, h: number, shown: ArrayLike<number>) {
  const lo = Math.min(g, h)
  const hi = Math.max(g, h)
  if (!shown[lo] || !shown[hi]) return false
  for (let k = lo + 1; k < hi; k++) if (shown[k]) return false
  return true
}

// The node at the other end of edge `e` from `n`.
export const other = (e: Edge, n: number) => (e.a === n ? e.b : e.a)
