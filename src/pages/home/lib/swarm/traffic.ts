import { BLOCKS } from "./shaders"
import { tremble, warm, type Threads } from "./threads"
import { HERO, other, type Web } from "./web"

// docs/design-brief.md › Главная на Swarm › Сцена › Краулер: what runs on
// the web. Light only where something lands: a node's heat rises on
// arrival and cools; the threads keep the heat crawlers leave on them.

export const Run = {
  // The one crawler that walks the visible nodes, toward the pointer when
  // there is one.
  Runner: 0,
  // The intro's crawl: breadth first over the hero's web.
  Crawl: 1,
  // Background traffic: a few hops between visible nodes.
  Packet: 2,
  // A pluck's impulses, out both ways from the touch, fading at each node.
  Pulse: 3,
  // Down the chain into a chapter, then a crawl of its web.
  Chain: 4,
} as const
export type Run = (typeof Run)[keyof typeof Run]

// World units a second.
const SPEED = [9, 15, 20, 19, 18]
// How bright the head is on the thread, by kind.
const HEAD = [1.25, 0.7, 0.85, 0, 1.1]
// Heat each leaves on the thread behind it (packets leave none).
const TRAIL = [0.45, 0.62, 0, 0, 0.55]
// Pool and per-kind limits, as in the spike.
const POOL = 192
const MAX_CRAWL = 46
const MAX_PACKETS = 14
const MAX_PULSES = 110
// Packets a second.
const PACKET_RATE = 3.2
// How hard each blows a block's dust off where it lands (a pulse: times
// its amplitude).
const SPLASH = [0.9, 0.7, 0.6, 0.5, 0.7]
// A tap (ADR-0013 › Касание): the node nearest it within this (CSS
// pixels) flashes, blows its dust off this hard and sends packets down its
// threads, each for 4–6 hops.
const TAP_REACH = 180
const TAP_SPLASH = 1.1

type Crawler = {
  e: number
  from: number
  to: number
  t: number
  kind: Run
  speed: number
  amp: number
  hops: number
  burst: number
  // The group a crawl keeps to.
  group: number
}

export type Net = {
  web: Web
  threads: Threads
  // Per node: heat (light, cools), lit (a crawl has been there), the
  // last crawl that visited it, and where it is on screen (CSS pixels).
  heat: Float32Array
  lit: Uint8Array
  visited: Int32Array
  sx: Float32Array
  sy: Float32Array
  // Per thread: its length (world units), how visible it is (0–1), and
  // the head of what runs on it this frame: u along it from a (or -1) and
  // its direction times its brightness.
  length: Float32Array
  alpha: Float32Array
  head: Float32Array
  // Per block: the strongest landing since the scene last took them (0
  // for none) and the node it came from.
  hit: Float32Array
  hitFrom: Int32Array
}

export function net(web: Web, threads: Threads): Net {
  const nodes = web.nodes
  const edges = web.edges.length
  return {
    web,
    threads,
    heat: new Float32Array(nodes),
    lit: new Uint8Array(nodes),
    visited: new Int32Array(nodes).fill(-1),
    sx: new Float32Array(nodes),
    sy: new Float32Array(nodes),
    length: new Float32Array(edges).fill(1),
    alpha: new Float32Array(edges).fill(1),
    head: new Float32Array(edges * 2),
    hit: new Float32Array(BLOCKS),
    hitFrom: new Int32Array(BLOCKS),
  }
}

export type Viewer = {
  width: number
  height: number
  // The pointer, while it is active (CSS pixels), or null.
  pointer: { x: number; y: number } | null
}

export type Traffic = ReturnType<typeof traffic>

// What runs on `n`, `random` its dice (seeded: the same on every visit).
export function traffic(n: Net, random: () => number) {
  const { web, threads } = n
  const pool: Crawler[] = Array.from({ length: POOL }, () => ({
    e: 0,
    from: 0,
    to: 0,
    t: 0,
    kind: Run.Packet,
    speed: 0,
    amp: 0,
    hops: 0,
    burst: 0,
    group: HERO,
  }))
  const kinds = new Int32Array(5)
  let live = 0
  let bursts = 0
  let packets = 0
  let lit = 0
  let view: Viewer = { width: 1, height: 1, pointer: null }

  const onScreen = (node: number, margin = 0.04) =>
    n.sx[node] > -view.width * margin &&
    n.sx[node] < view.width * (1 + margin) &&
    n.sy[node] > -view.height * margin &&
    n.sy[node] < view.height * (1 + margin)

  // `capped`: a tap's packets aren't, only the pool holds them back.
  function spawn(
    e: number,
    from: number,
    kind: Run,
    amp = 1,
    t = 0,
    capped = true
  ) {
    if (live >= POOL) return null
    if (kind === Run.Crawl && kinds[Run.Crawl] >= MAX_CRAWL) return null
    if (capped && kind === Run.Packet && kinds[Run.Packet] >= MAX_PACKETS)
      return null
    if (kind === Run.Pulse && kinds[Run.Pulse] >= MAX_PULSES) return null
    const c = pool[live++]
    c.e = e
    c.from = from
    c.to = other(web.edges[e], from)
    c.t = t
    c.kind = kind
    c.speed = kind === Run.Packet ? SPEED[kind] + random() * 10 : SPEED[kind]
    c.amp = amp
    c.hops = 0
    c.burst = 0
    c.group = HERO
    kinds[kind]++
    return c
  }

  function remove(i: number) {
    kinds[pool[i].kind]--
    live--
    // Swap with the last live one: the pool keeps its objects.
    const last = pool[live]
    pool[live] = pool[i]
    pool[i] = last
  }

  // Lights `node`; the readout counts the hero's.
  function light(node: number, amount: number) {
    n.heat[node] = Math.max(n.heat[node], amount)
    if (!n.lit[node]) {
      n.lit[node] = 1
      if (web.group[node] === HERO) lit++
    }
  }

  // A crawl from `node` along every thread to a node of `group` this
  // burst hasn't reached.
  function spread(node: number, burst: number, group: number) {
    n.visited[node] = burst
    for (let k = web.start[node]; k < web.start[node + 1]; k++) {
      const e = web.list[k]
      const to = other(web.edges[e], node)
      if (n.visited[to] === burst || n.alpha[e] < 0.15) continue
      if (web.group[to] !== group) continue
      const c = spawn(e, node, Run.Crawl)
      if (c) {
        c.burst = burst
        c.group = group
      }
    }
  }

  // The landing makes the threads at the node tremble.
  function shake(node: number) {
    for (let k = web.start[node]; k < web.start[node + 1]; k++) {
      const e = web.list[k]
      tremble(
        threads,
        e,
        web.edges[e].a === node,
        (random() - 0.5) * 1.6,
        (random() - 0.5) * 1.2
      )
    }
  }

  // A random thread at `node` but `but`, visible over `alpha`, not back to
  // `from` (and, with `seen`, to a node on screen); -1 when there is none.
  function pick(node: number, but: number, from: number, alpha: number) {
    let chosen = -1
    let seen = 0
    for (let k = web.start[node]; k < web.start[node + 1]; k++) {
      const e = web.list[k]
      if (e === but || n.alpha[e] <= alpha) continue
      if (other(web.edges[e], node) === from) continue
      // Reservoir sampling: each candidate equally likely, no array.
      if (random() * ++seen < 1) chosen = e
    }
    return chosen
  }

  // The runner's next thread: toward the pointer when it is active, else a
  // wander that favours the blocks, never straight back.
  function next(c: Crawler) {
    const node = c.to
    let best = -1
    let bestScore = Infinity
    let blocks = -1
    let seenBlocks = 0
    let any = -1
    let seen = 0
    for (let k = web.start[node]; k < web.start[node + 1]; k++) {
      const e = web.list[k]
      if (n.alpha[e] <= 0.35) continue
      const to = other(web.edges[e], node)
      if (to === c.from || !onScreen(to)) continue
      if (random() * ++seen < 1) any = e
      if (to < BLOCKS && random() * ++seenBlocks < 1) blocks = e
      if (view.pointer) {
        const d =
          Math.hypot(n.sx[to] - view.pointer.x, n.sy[to] - view.pointer.y) *
          (0.75 + 0.5 * random())
        if (d < bestScore) {
          bestScore = d
          best = e
        }
      }
    }
    if (view.pointer && best >= 0) return best
    if (blocks >= 0 && random() < 0.3) return blocks
    if (any >= 0) return any
    return pick(node, -1, -1, 0.35)
  }

  // Crawler `c` reached its node: true if it goes on.
  function arrive(c: Crawler) {
    const node = c.to
    const blow = SPLASH[c.kind] * (c.kind === Run.Pulse ? c.amp : 1)
    if (node < BLOCKS && blow > n.hit[node]) {
      n.hit[node] = blow
      n.hitFrom[node] = c.from
    }
    switch (c.kind) {
      case Run.Pulse: {
        n.heat[node] = Math.max(n.heat[node], c.amp * 0.8)
        const amp = c.amp * 0.55
        if (amp > 0.16) {
          for (let k = web.start[node]; k < web.start[node + 1]; k++) {
            const e = web.list[k]
            if (e !== c.e && n.alpha[e] > 0.2) spawn(e, node, Run.Pulse, amp)
          }
        }
        return false
      }
      case Run.Packet: {
        n.heat[node] = Math.max(n.heat[node], 0.55)
        if (--c.hops <= 0) return false
        const e = pick(node, c.e, c.from, 0.5)
        if (e < 0) return false
        c.from = node
        c.e = e
        c.to = other(web.edges[e], node)
        c.t = 0
        return true
      }
      case Run.Crawl:
        light(node, 0.9)
        shake(node)
        spread(node, c.burst, c.group)
        return false
      case Run.Chain:
        light(node, 1)
        shake(node)
        spread(node, ++bursts, c.group)
        return false
      default: {
        light(node, 1)
        shake(node)
        const e = next(c)
        if (e < 0) return false
        c.from = node
        c.e = e
        c.to = other(web.edges[e], node)
        c.t = 0
        return true
      }
    }
  }

  // A runner from the first block on screen, else any node on screen.
  function startRunner() {
    let from = -1
    for (let node = 0; node < web.nodes && from < 0; node++) {
      if (web.start[node + 1] > web.start[node] && onScreen(node)) from = node
    }
    if (from < 0) return
    const e = pick(from, -1, -1, 0.35)
    if (e >= 0) spawn(e, from, Run.Runner)
  }

  function sendPackets(dt: number) {
    const edges = web.edges.length
    packets += dt * PACKET_RATE
    while (packets >= 1) {
      packets--
      for (let tries = 0; tries < 24; tries++) {
        const e = Math.floor(random() * edges)
        if (n.alpha[e] < 0.5) continue
        const from = random() < 0.5 ? web.edges[e].a : web.edges[e].b
        if (!onScreen(from, -0.02)) continue
        const c = spawn(e, from, Run.Packet)
        if (c) c.hops = 3 + Math.floor(random() * 4)
        break
      }
    }
  }

  return {
    // How many of the hero's nodes a crawl has lit.
    get lit() {
      return lit
    },
    // The intro's crawl, breadth first over the hero's web from `node`.
    crawl(node: number) {
      light(node, 1)
      spread(node, ++bursts, HERO)
    },
    // One crawl over the web of `group` from each of `nodes` (the footer's,
    // from the blocks gathered there).
    burst(nodes: readonly number[], group: number) {
      const burst = ++bursts
      for (const node of nodes) spread(node, burst, group)
    },
    // Down chain thread `e` from `from` (starting `t` along it), then a
    // crawl of the web of `group` from where it lands.
    chain(e: number, from: number, group: number, t = 0) {
      const c = spawn(e, from, Run.Chain, 1, t)
      if (c) c.group = group
    },
    // The intro's crawl that stalled (every crawler landed, nodes of the
    // hero left dark) goes on from a lit node with a dark neighbour there.
    resume() {
      if (kinds[Run.Crawl] || lit >= web.heroNodes) return
      const burst = ++bursts
      const hero = (node: number) => web.group[node] === HERO
      for (let node = 0; node < web.nodes; node++) {
        if (n.lit[node] && hero(node)) n.visited[node] = burst
      }
      for (let node = 0; node < web.nodes; node++) {
        if (!n.lit[node] || !hero(node)) continue
        for (let k = web.start[node]; k < web.start[node + 1]; k++) {
          const to = other(web.edges[web.list[k]], node)
          if (!n.lit[to] && hero(to)) {
            spread(node, burst, HERO)
            return
          }
        }
      }
    },
    // The end of the intro's crawl: every node of the hero indexed.
    indexAll() {
      for (let node = 0; node < web.nodes; node++) {
        if (!n.lit[node] && web.group[node] === HERO) {
          n.lit[node] = 1
          lit++
        }
      }
    },
    // A pluck at point k of thread e: impulses out both ways.
    pulses(e: number, k: number, amp: number) {
      const { a, b } = web.edges[e]
      const u = k / threads.segments
      spawn(e, a, Run.Pulse, amp, u)
      spawn(e, b, Run.Pulse, amp, 1 - u)
    },
    // A tap at (x, y) in CSS pixels: the nearest node on screen with a
    // visible thread, within reach, flashes (a block blows its dust off
    // from the front) and sends a packet down each of its visible threads.
    // The node, or -1 when none is near.
    tap(x: number, y: number, viewer: Viewer) {
      view = viewer
      let best = -1
      let bestD = TAP_REACH
      for (let node = 0; node < web.nodes; node++) {
        if (!onScreen(node, 0)) continue
        const d = Math.hypot(n.sx[node] - x, n.sy[node] - y)
        if (d > bestD) continue
        let threaded = false
        for (let k = web.start[node]; k < web.start[node + 1]; k++) {
          if (n.alpha[web.list[k]] > 0.3) threaded = true
        }
        if (!threaded) continue
        best = node
        bestD = d
      }
      if (best < 0) return -1
      n.heat[best] = 1
      if (best < BLOCKS && TAP_SPLASH > n.hit[best]) {
        n.hit[best] = TAP_SPLASH
        // From itself: no direction, the burst comes out the front.
        n.hitFrom[best] = best
      }
      for (let k = web.start[best]; k < web.start[best + 1]; k++) {
        const e = web.list[k]
        if (n.alpha[e] <= 0.3) continue
        const c = spawn(e, best, Run.Packet, 1, 0, false)
        if (c) c.hops = 4 + Math.floor(random() * 3)
      }
      return best
    },
    // `dt` seconds of traffic; `running`: after the intro, the runner and
    // the packets go.
    step(dt: number, viewer: Viewer, running: boolean) {
      view = viewer
      if (running) {
        if (!kinds[Run.Runner]) startRunner()
        sendPackets(dt)
      }
      n.head.fill(-1)
      for (let i = live - 1; i >= 0; i--) {
        const c = pool[i]
        const speed =
          c.kind === Run.Runner && view.pointer ? c.speed * 1.5 : c.speed
        c.t += (speed * dt) / n.length[c.e]
        if (c.t >= 1 && !arrive(c)) {
          remove(i)
          continue
        }
        const forward = c.from === web.edges[c.e].a
        const u = forward ? c.t : 1 - c.t
        if (c.kind !== Run.Pulse) {
          n.head[c.e * 2] = u
          n.head[c.e * 2 + 1] = (forward ? 1 : -1) * HEAD[c.kind]
        }
        if (c.kind === Run.Pulse) warm(threads, c.e, u, c.amp)
        else if (TRAIL[c.kind]) warm(threads, c.e, u, TRAIL[c.kind], 0.2)
      }
    },
  }
}
