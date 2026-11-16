import { describe, expect, it } from "vitest"

import { rng } from "./math"
import { BLOCKS } from "./shaders"
import { threads } from "./threads"
import { net, Run, traffic, type Viewer } from "./traffic"
import { heroWeb } from "./web"

const frame = {
  width: 1440,
  height: 843,
  logo: { left: 1115, top: 540, right: 1368, bottom: 793 },
  text: [{ left: 48, top: 200, right: 900, bottom: 420 }],
}

function setup() {
  const web = heroWeb(frame)
  const state = net(web, threads(web.edges.length, 14))
  // Every node on screen, threads two units long.
  state.sx.fill(500)
  state.sy.fill(400)
  state.length.fill(2)
  const run = traffic(state, rng(3))
  const viewer: Viewer = { width: 1440, height: 900, pointer: null }
  return { web, state, run, viewer }
}

describe("traffic", () => {
  it("crawls the whole web breadth first, lighting each node it reaches", () => {
    const { web, state, run, viewer } = setup()
    run.crawl(BLOCKS + 3)
    expect(run.lit).toBe(1)
    let steps = 0
    while (run.lit < web.nodes && steps++ < 400) {
      run.step(1 / 60, viewer, false)
      run.resume()
    }
    expect(run.lit).toBe(web.nodes)
    expect([...state.lit].every(Boolean)).toBe(true)
    // Landings warm the nodes and the threads.
    expect(Math.max(...state.heat)).toBeGreaterThan(0.8)
    expect(Math.max(...state.threads.heat)).toBeGreaterThan(0.3)
  })

  it("indexes every node at the end of the crawl", () => {
    const { web, run } = setup()
    run.indexAll()
    expect(run.lit).toBe(web.nodes)
  })

  it("sends a runner and packets once running, heads on their threads", () => {
    const { state, run, viewer } = setup()
    run.step(1 / 60, viewer, false)
    expect([...state.head].every((v) => v === -1)).toBe(true)
    for (let i = 0; i < 30; i++) run.step(1 / 60, viewer, true)
    const heads = []
    for (let e = 0; e < state.head.length / 2; e++) {
      if (state.head[e * 2] > -0.5) heads.push(state.head[e * 2 + 1])
    }
    // The runner's head is the brightest; packets dimmer.
    expect(heads.length).toBeGreaterThan(1)
    expect(Math.max(...heads.map(Math.abs))).toBeCloseTo(1.25)
  })

  it("lights nothing until something lands", () => {
    const { state, run, viewer } = setup()
    // Started, on their threads, not there yet.
    run.step(1 / 600, viewer, true)
    run.step(1 / 600, viewer, true)
    expect([...state.head].some((v) => v > -0.5)).toBe(true)
    expect([...state.heat].every((h) => h === 0)).toBe(true)
    for (let i = 0; i < 30; i++) run.step(1 / 60, viewer, true)
    expect(Math.max(...state.heat)).toBeGreaterThan(0.5)
  })

  it("sends a pluck's pulses both ways, fading", () => {
    const { web, state, run, viewer } = setup()
    const e = web.edges.findIndex((edge) => edge.a >= BLOCKS)
    run.pulses(e, 7, 1)
    run.step(1 / 60, viewer, false)
    const o = e * 15
    const heat = [...state.threads.heat.slice(o, o + 15)]
    expect(heat.filter((h) => h > 0.5).length).toBeGreaterThanOrEqual(2)
    for (let i = 0; i < 300; i++) run.step(1 / 60, viewer, false)
    // They spread and die out: nothing runs, nodes warmed.
    expect([...state.head].every((v) => v === -1)).toBe(true)
    expect(state.heat[web.edges[e].a]).toBeGreaterThan(0.5)
  })

  it("walks the runner toward the pointer", () => {
    const { web, state, run } = setup()
    // Nodes spread over the screen as laid.
    web.far.forEach(({ u, v }, j) => {
      state.sx[BLOCKS + j] = u * 1440
      state.sy[BLOCKS + j] = v * 843
    })
    for (let i = 0; i < BLOCKS; i++) {
      state.sx[i] = 1240
      state.sy[i] = 660
    }
    const viewer: Viewer = { width: 1440, height: 900, pointer: { x: 0, y: 0 } }
    const near: number[] = []
    for (let i = 0; i < 600; i++) {
      run.step(1 / 60, viewer, true)
      for (let e = 0; e < web.edges.length; e++) {
        if (Math.abs(state.head[e * 2 + 1]) === 1.25) {
          const { a, b } = web.edges[e]
          near.push(
            Math.min(state.sx[a] + state.sy[a], state.sx[b] + state.sy[b])
          )
        }
      }
    }
    // Late in the walk it runs near the top left corner.
    const late = near.slice(-100)
    expect(Math.min(...late)).toBeLessThan(500)
    expect(Run.Runner).toBe(0)
  })
})
