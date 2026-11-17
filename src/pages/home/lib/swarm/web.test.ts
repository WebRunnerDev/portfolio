import { describe, expect, it } from "vitest"

import { BLOCKS } from "./shaders"
import {
  blockCenter,
  chapter,
  CHAIN,
  CHAPTER_BLOCKS,
  CHAPTER_NODES,
  CHAPTERS,
  FOOTER,
  HERO,
  HERO_NODES,
  Kind,
  linkShows,
  other,
  pageWeb,
  type Frame,
  type PageFrame,
  type Rect,
} from "./web"

const hero: Frame = {
  width: 1440,
  height: 843,
  logo: { left: 1115, top: 540, right: 1368, bottom: 793 },
  text: [
    { left: 48, top: 200, right: 900, bottom: 420 },
    { left: 48, top: 460, right: 700, bottom: 560 },
  ],
}
// A chapter: its text across the content box under the gap, its rail in
// the first column.
const section = (height: number): Frame => ({
  width: 1440,
  height,
  logo: { left: 152, top: 420, right: 280, bottom: 548 },
  text: [{ left: 152, top: 136, right: 1288, bottom: height }],
})
const page: PageFrame = {
  view: { width: 1440, height: 900 },
  hero,
  chapters: [section(1200), section(1800), section(900), section(1100)],
  footer: {
    width: 1440,
    height: 700,
    logo: { left: 152, top: 300, right: 400, bottom: 548 },
    text: [
      { left: 152, top: 96, right: 1100, bottom: 260 },
      { left: 432, top: 300, right: 1288, bottom: 600 },
    ],
  },
}
const frameOf = (group: number) =>
  group === HERO
    ? hero
    : group === FOOTER
      ? page.footer!
      : page.chapters[group - 1]!

const inside = (r: Rect, x: number, y: number) =>
  x > r.left && x < r.right && y > r.top && y < r.bottom

describe("pageWeb", () => {
  const web = pageWeb(page)
  const of = (group: number) => web.far.filter((f) => f.group === group)

  it("lays the same web on every visit", () => {
    expect(pageWeb(page)).toEqual(web)
  })

  it("lays the far nodes of each part apart, clear of its text, deep behind", () => {
    expect(of(HERO).length).toBeGreaterThan(HERO_NODES * 0.8)
    expect(of(HERO).length).toBeLessThanOrEqual(HERO_NODES)
    for (let s = 0; s < CHAPTERS; s++) {
      expect(of(chapter(s)).length).toBeGreaterThan(CHAPTER_NODES * 0.5)
    }
    expect(of(FOOTER).length).toBeGreaterThan(10)
    expect(web.nodes).toBe(BLOCKS + web.far.length)
    expect(web.heroNodes).toBe(BLOCKS + of(HERO).length)
    for (let group = HERO; group <= FOOTER; group++) {
      const frame = frameOf(group)
      const at = of(group).map(({ u, v }) => [
        u * frame.width,
        v * frame.height,
      ])
      for (const [x, y] of at) {
        for (const r of frame.text) expect(inside(r, x, y)).toBe(false)
      }
      let closest = Infinity
      for (let i = 0; i < at.length; i++) {
        for (let j = i + 1; j < at.length; j++) {
          closest = Math.min(
            closest,
            Math.hypot(at[i][0] - at[j][0], at[i][1] - at[j][1])
          )
        }
      }
      expect(closest).toBeGreaterThan(50)
    }
    for (const f of web.far) expect(f.z).toBeLessThan(-2.5)
    // Far nodes in the order of their groups, after the blocks.
    for (let n = 0; n < web.nodes; n++) {
      expect(web.group[n]).toBe(n < BLOCKS ? HERO : web.far[n - BLOCKS].group)
    }
  })

  it("lays the hero's web as before the chapters came", () => {
    const alone = pageWeb({ ...page, chapters: [], footer: null })
    expect(alone.far.filter((f) => f.group === HERO)).toEqual(of(HERO))
  })

  it("threads each far node to its nearest in its own part", () => {
    const own = web.edges.filter((e) => e.kind === Kind.Web)
    expect(own.length).toBeGreaterThanOrEqual(web.far.length * 1.5)
    expect(own.length).toBeLessThanOrEqual(web.far.length * 3)
    for (const e of own) {
      expect(e.a).toBeGreaterThanOrEqual(BLOCKS)
      expect(web.group[e.a]).toBe(web.group[e.b])
    }
    const keys = web.edges.map(
      (e) => `${Math.min(e.a, e.b)}-${Math.max(e.a, e.b)}`
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("runs one chain from the logo through the chapters' blocks", () => {
    expect(web.chain).toHaveLength(CHAPTERS)
    web.chain.forEach((e, s) => {
      expect(web.edges[e]).toMatchObject({
        a: CHAIN[s],
        b: CHAPTER_BLOCKS[s],
        kind: Kind.Chain,
      })
    })
    // The rest of the logo's threads stay between its blocks.
    const logo = web.edges.filter((e) => e.kind === Kind.Logo)
    expect(logo.length).toBeGreaterThan(2)
    for (const e of logo) expect(Math.max(e.a, e.b)).toBeLessThan(BLOCKS)
  })

  it("attaches the blocks to the hero's and the footer's webs, a chapter's block to its own", () => {
    const attach = web.edges.filter((e) => e.kind === Kind.Attach)
    for (const e of attach) {
      expect(e.a).toBeLessThan(BLOCKS)
      expect(e.b).toBeGreaterThanOrEqual(BLOCKS)
    }
    const to = (group: number) => attach.filter((e) => web.group[e.b] === group)
    expect(new Set(to(HERO).map((e) => e.a)).size).toBe(BLOCKS)
    expect(new Set(to(FOOTER).map((e) => e.a)).size).toBe(BLOCKS)
    for (let s = 0; s < CHAPTERS; s++) {
      const mine = to(chapter(s))
      expect(mine).toHaveLength(4)
      for (const e of mine) expect(e.a).toBe(CHAPTER_BLOCKS[s])
    }
  })

  it("links each part to the next by a few long threads across the width", () => {
    const links = web.edges.filter((e) => e.kind === Kind.Link)
    const between = (g: number, h: number) =>
      links.filter((e) => web.group[e.a] === g && web.group[e.b] === h)
    const next = [
      [HERO, chapter(0)],
      ...Array.from({ length: CHAPTERS - 1 }, (_, s) => [
        chapter(s),
        chapter(s + 1),
      ]),
      [chapter(CHAPTERS - 1), FOOTER],
    ]
    for (const [g, h] of next) {
      const mine = between(g, h)
      expect(mine.length).toBeGreaterThan(1)
      expect(mine.length).toBeLessThanOrEqual(3)
      // Not in a bundle: from different thirds of the width.
      const bands = mine.map((e) => Math.floor(web.far[e.b - BLOCKS].u * 3))
      expect(new Set(bands).size).toBe(mine.length)
    }
  })

  it("lays a web for every chapter slot, shown or not yet", () => {
    const two = pageWeb({ ...page, chapters: page.chapters.slice(0, 2) })
    for (let s = 0; s < CHAPTERS; s++) {
      expect(two.far.some((f) => f.group === chapter(s))).toBe(true)
    }
    expect(two.chain).toHaveLength(CHAPTERS)
  })

  it("lists each node's threads", () => {
    for (let n = 0; n < web.nodes; n++) {
      const mine = web.list.slice(web.start[n], web.start[n + 1])
      const expected = web.edges.flatMap((e, i) =>
        e.a === n || e.b === n ? [i] : []
      )
      expect([...mine].sort((a, b) => a - b)).toEqual(expected)
      for (const i of mine) {
        expect(other(web.edges[i], n)).not.toBe(n)
      }
    }
  })
})

describe("linkShows", () => {
  it("shows a long thread between two parts on the page with none between", () => {
    const shown = [1, 1, 1, 0, 0, 1]
    expect(linkShows(HERO, chapter(0), shown)).toBe(true)
    expect(linkShows(chapter(0), chapter(1), shown)).toBe(true)
    // The last chapter shown links to the footer, past the slots not taken.
    expect(linkShows(chapter(1), FOOTER, shown)).toBe(true)
    expect(linkShows(chapter(1), chapter(2), shown)).toBe(false)
    expect(linkShows(chapter(0), FOOTER, shown)).toBe(false)
    expect(linkShows(HERO, FOOTER, [1, 0, 0, 0, 0, 1])).toBe(true)
  })
})

describe("blockCenter", () => {
  it("lays the blocks inside the logo's square", () => {
    for (let i = 0; i < BLOCKS; i++) {
      const { x, y } = blockCenter(hero.logo, i)
      expect(x).toBeGreaterThan(hero.logo.left)
      expect(x).toBeLessThan(hero.logo.right)
      expect(y).toBeGreaterThan(hero.logo.top)
      expect(y).toBeLessThan(hero.logo.bottom)
    }
  })
})
