import { describe, expect, it } from "vitest"

import { BLOCKS } from "./shaders"
import {
  blockCenter,
  heroWeb,
  HERO_NODES,
  Kind,
  other,
  type HeroFrame,
} from "./web"

const frame: HeroFrame = {
  width: 1440,
  height: 843,
  logo: { left: 1115, top: 540, right: 1368, bottom: 793 },
  text: [
    { left: 48, top: 200, right: 900, bottom: 420 },
    { left: 48, top: 460, right: 700, bottom: 560 },
  ],
}

describe("heroWeb", () => {
  const web = heroWeb(frame)

  it("lays the same web on every visit", () => {
    expect(heroWeb(frame)).toEqual(web)
  })

  it("lays the far nodes apart, clear of the text, deep behind", () => {
    expect(web.far.length).toBeGreaterThan(HERO_NODES * 0.8)
    expect(web.far.length).toBeLessThanOrEqual(HERO_NODES)
    expect(web.nodes).toBe(BLOCKS + web.far.length)
    const at = web.far.map(({ u, v }) => [u * frame.width, v * frame.height])
    for (const [x, y] of at) {
      for (const r of frame.text) {
        const inside = x > r.left && x < r.right && y > r.top && y < r.bottom
        expect(inside).toBe(false)
      }
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
    for (const f of web.far) expect(f.z).toBeLessThan(-2.5)
  })

  it("threads each far node to its nearest, the logo's blocks to theirs", () => {
    const web3 = web.edges.filter((e) => e.kind === Kind.Web)
    // Three each, a pair counted once.
    expect(web3.length).toBeGreaterThanOrEqual(web.far.length * 1.5)
    expect(web3.length).toBeLessThanOrEqual(web.far.length * 3)
    const logo = web.edges.filter((e) => e.kind === Kind.Logo)
    expect(logo.length).toBeGreaterThan(BLOCKS - 1)
    for (const e of logo) expect(Math.max(e.a, e.b)).toBeLessThan(BLOCKS)
    const attach = web.edges.filter((e) => e.kind === Kind.Attach)
    expect(attach.length).toBeGreaterThanOrEqual(BLOCKS)
    for (const e of attach) {
      expect(e.a).toBeLessThan(BLOCKS)
      expect(e.b).toBeGreaterThanOrEqual(BLOCKS)
    }
    const keys = web.edges.map(
      (e) => `${Math.min(e.a, e.b)}-${Math.max(e.a, e.b)}`
    )
    expect(new Set(keys).size).toBe(keys.length)
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

describe("blockCenter", () => {
  it("lays the blocks inside the logo's square", () => {
    for (let i = 0; i < BLOCKS; i++) {
      const { x, y } = blockCenter(frame.logo, i)
      expect(x).toBeGreaterThan(frame.logo.left)
      expect(x).toBeLessThan(frame.logo.right)
      expect(y).toBeGreaterThan(frame.logo.top)
      expect(y).toBeLessThan(frame.logo.bottom)
    }
  })
})
