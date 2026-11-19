import { palette, type Palette } from "./colors"
import { dust, PARTICLE, rounds } from "./dust"
import { dataTexture, deleteTarget, sizeTarget, target } from "./gl"
import { intro, readout } from "./intro"
import {
  ABOVE,
  arrival,
  CAM_D,
  FOV,
  gatherSlot,
  gathering,
  logoSlot,
  railSlot,
  stepOut,
  toWorld,
  VIEW_H,
  type Box,
  type Viewport,
  type Zone,
} from "./layout"
import {
  clamp,
  compose,
  damp,
  lerp,
  lookAt,
  multiply,
  perspective,
  rng,
} from "./math"
import { DESKTOP, sizeK, type Quality } from "./quality"
import {
  A_HOME,
  A_NODE,
  A_NORMAL,
  A_SEED,
  BLOCKS,
  DUST_FRAGMENT,
  DUST_VERTEX,
  FINISH_FRAGMENT,
  FINISH_VERTEX,
  GLOW_BLUR_FRAGMENT,
  GLOW_DOWN_FRAGMENT,
  MASKS,
  T_INFO,
  T_NEXT,
  T_POINT,
  T_PREV,
  THREAD_FRAGMENT,
  THREAD_VERTEX,
} from "./shaders"
import { splash, splashes } from "./splash"
import {
  FLOATS,
  lay,
  pairs,
  pluck,
  ribbon,
  threads as makeThreads,
  wave,
} from "./threads"
import { net, traffic, type Viewer } from "./traffic"
import {
  chapter,
  CHAIN,
  CHAPTER_BLOCKS,
  CHAPTERS,
  FOOTER,
  HERO,
  Kind,
  linkShows,
  pageWeb,
  type Frame,
  type PageFrame,
  type Rect,
} from "./web"

// The page tells the scene where things are through attributes, read once
// a frame (a class or an attribute, not an import, as the logo flight): the
// hero the web lies over, its logo square the blocks gather into, each
// chapter's rail (in its section: the full stop of its figure) a block
// comes to, the footer's logo
// square (in the footer) they all gather into at the end, the boxes of
// text the web steps out of, and the hero's crawl readout.
const HERO_WEB = "[data-swarm-web]"
const HERO_ANCHOR = '[data-swarm-anchor="hero"]'
const RAIL = '[data-swarm-anchor="chapter"]'
const FOOTER_ANCHOR = '[data-swarm-anchor="footer"]'
const TEXT = "[data-swarm-text]"
const READOUT = "[data-swarm-readout]"
// The page's elements are looked up again this often (ms): a chapter
// whose data comes late, text that changed.
const FIND_MS = 500

// The key light, from the top left and in front, as in the spike.
const KEY = (() => {
  const [x, y, z] = [-0.5, 0.62, 0.6]
  const l = Math.hypot(x, y, z)
  return [x / l, y / l, z / l]
})()
// The camera follows the pointer a little: half a unit across the screen.
const PARALLAX_X = 0.5
const PARALLAX_Y = 0.35
const PARALLAX_RATE = 2
// The spike's vignette (dark theme) and grain.
const VIGNETTE = 1
const GRAIN = 0.012
// The glow over its single level: the spike's bloom summed five.
const GLOW_GAIN = 1.6
// The light theme's cold threads: `outline` at this much.
const LINE_ALPHA = 0.55
// Physics and traffic step at most this much (s): a long frame doesn't
// throw the threads.
const MAX_STEP = 1 / 30
// A pointer that hasn't moved for this long (ms) is no longer active.
const POINTER_IDLE = 1800
// A pluck: the pointer within this of a thread (CSS pixels), moving.
const PLUCK_RADIUS = 22
const PLUCK_MOVE = 1.5
// The pointer parts the dust (docs/design-brief.md › Главная на Swarm ›
// Сцена › Указатель): how much, from half at rest to all of it at speed,
// rising faster than it falls; its speed builds with the distance moved
// (CSS pixels to the full) and fades.
const PUSH_UP = 4
const PUSH_DOWN = 1.4
const SPEED_PX = 400
const SPEED_FADE = 1.8
// A tap or a click on the web (ADR-0013 › Касание): one that comes up
// within this of where it went down (CSS pixels), this soon (ms). A touch
// the page scrolls with is cancelled on the way. Not on what takes a tap
// of its own, nor the header, which is opaque over the scene.
const TAP_SLOP = 10
const TAP_MS = 500
const NOT_WEB =
  "a, button, input, select, textarea, label, summary, [contenteditable], " +
  "[role=button], [role=link], [role=menuitem], [role=tab], " +
  "[role=dialog], header"
// The blocks lean toward the pointer on a spring, near it only.
const LEAN_FOLLOW = 7
const LEAN = 0.18
const LEAN_MAX = 0.55
const LEAN_REACH = 30
const LEAN_STIFF = 70
const LEAN_DAMP = 9
// Where the intro's crawl starts: the far node nearest the hero's middle,
// so it spreads both ways.
const SEED = { u: 0.5, v: 0.5 }
// Parallax of depth (docs/design-brief.md › Главная на Swarm, the brief's
// Хореография: the text doesn't move): a far node this deep (world units)
// lags the scroll by this share, a shallower one less.
const LAG = 0.42
const LAG_DEPTH = 13
// A chapter's block lands: its dust blows off this hard, and the crawler
// comes down the chain from this far above it (world units).
const ARRIVE_SPLASH = 1.2
const CHAIN_REACH = VIEW_H * 0.6
// A chapter's block threads to its web; as its rail rides down a long
// chapter those threads stretch, and fade from this share of the
// viewport's height to twice it.
const STRETCH = 0.45
// Threads with both ends this far off screen (CSS pixels) one way aren't
// laid or drawn this frame.
const CULL = 80
// A group's dust is drawn while one of its nodes is this near the screen
// (CSS pixels): a node's dust puffs out past it by its heat.
const NEAR = 160

const DUST_UNIFORMS = [
  "uViewProj",
  "uBlock",
  "uForm",
  "uSplash",
  "uSplashA",
  "uNodes",
  "uTime",
  "uScale",
  "uSizeK",
  "uDpr",
  "uPush",
  "uRes",
  "uPointer",
  "uKey",
  "uSteel",
  "uRim",
  "uFlash",
  "uTone",
  "uLeave",
  "uViewH",
] as const
const THREAD_UNIFORMS = [
  "uViewProj",
  "uEdges",
  "uRes",
  "uDpr",
  "uFocal",
  "uMask",
  "uMaskK",
  "uTone",
  "uDark",
  "uLineAlpha",
  "uLine",
  "uPrimary",
  "uFade",
] as const
const FINISH_UNIFORMS = [
  "uScene",
  "uGlow",
  "uGlowK",
  "uSurface",
  "uSize",
  "uTone",
  "uVignette",
  "uGrain",
  "uTime",
] as const
const DOWN_UNIFORMS = ["uScene", "uTexel"] as const
const BLUR_UNIFORMS = ["uSource", "uStep"] as const

// Texture units: the finish's two, the glow's source, the scene's data.
const UNIT_SCENE = 0
const UNIT_GLOW = 1
const UNIT_NODES = 2
const UNIT_EDGES = 3
// How long the dust takes to blow off as the home page is left (ADR-0014).
const LEAVE_MS = 900

type Uniforms<T extends readonly string[]> = Record<
  T[number],
  WebGLUniformLocation | null
>

export type Swarm = {
  play: () => void
  pause: () => void
  // A step down mid-visit (ADR-0013 › Понижение на ходу): `lowered`'s
  // particles, glow, DPR and frame cap from the next frame on, a shorter
  // draw range rather than new dust. The web stays as it was laid.
  lower: (quality: Quality) => void
  // The home page is left (ADR-0014): the dust blows off over LEAVE_MS
  // without reading the page, then `done`; at once if it never drew.
  leave: (done: () => void) => void
  destroy: () => void
}

export type SwarmEvents = {
  // Every drawn frame's timestamp (the FPS meter).
  onFrame: (now: number) => void
  // After the first frame is drawn: the canvas may fade in.
  onReady: () => void
  // The shaders didn't link or the context was lost (`reason`, in words):
  // the scene is done.
  onFail: (reason: string) => void
}

const toRect = (box: Box, left: number, top: number): Rect => ({
  left: box.left - left,
  top: box.top - top,
  right: box.left + box.width - left,
  bottom: box.top + box.height - top,
})

// The Swarm (ADR-0013, docs/design-brief.md › Главная на Swarm) on a canvas
// fixed over the viewport behind the home page: the logo's seven blocks of
// dust and the hero's web around them. Far nodes are small rhombi of the
// same dust deep behind; threads run taut between nodes, crawlers and
// packets run on them, light comes where they land, and the pointer plucks
// the threads it crosses. In the intro a crawl lights the web breadth
// first and the readout counts it; then the dust gathers into the hero's
// logo square and the web draws in. The web steps out of the hero's text.
// Shaders link in parallel where the browser can and the dust is laid in
// slices, so no long task lands on an input. Draws only while playing.
// Returns null without WebGL2.
export function swarm(
  canvas: HTMLCanvasElement,
  { onFrame, onReady, onFail }: SwarmEvents,
  quality: Quality = DESKTOP
): Swarm | null {
  const context = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: !quality.post,
    powerPreference: "high-performance",
  })
  if (!context) return null
  const gl = context
  const parallel = gl.getExtension("KHR_parallel_shader_compile")
  const lose = gl.getExtension("WEBGL_lose_context")
  // Light over 1 for the finish to tone map; without it the scene tone maps
  // in its own shaders.
  const hdr = quality.post && !!gl.getExtension("EXT_color_buffer_float")
  // What a step down changes; the rest of `quality` is the scene's as built.
  let live = quality

  const shaders: WebGLShader[] = []
  function build(vertex: string, fragment: string) {
    const program = gl.createProgram()
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      gl.attachShader(program, shader)
      shaders.push(shader)
    }
    // Not checked until it is done: asking at once waits for the compiler.
    gl.linkProgram(program)
    return program
  }
  const glows = quality.post && quality.glow > 0
  const dustProgram = build(DUST_VERTEX, DUST_FRAGMENT)
  const threadProgram = build(THREAD_VERTEX, THREAD_FRAGMENT)
  const finishProgram = quality.post
    ? build(FINISH_VERTEX, FINISH_FRAGMENT)
    : null
  const downProgram = glows ? build(FINISH_VERTEX, GLOW_DOWN_FRAGMENT) : null
  const blurProgram = glows ? build(FINISH_VERTEX, GLOW_BLUR_FRAGMENT) : null
  const programs = [
    dustProgram,
    threadProgram,
    finishProgram,
    downProgram,
    blurProgram,
  ].filter((p) => p !== null)

  // The page's text, the chapters shown (their rails and sections, in the
  // page's order) and the footer, found again every FIND_MS.
  let texts: Element[] = []
  let rails: Element[] = []
  let sections: Element[] = []
  let footerAnchor: Element | null = null
  let footer: Element | null = null
  let foundAt = -Infinity

  let leaveAt = -1
  let leaveDone: (() => void) | null = null
  let lastT = 0
  let lastMask = 0

  // The page's web, laid once for the page as it is now.
  const web = pageWeb(pageFrame(), quality.nodes)
  const nodes = web.nodes
  const edgeCount = web.edges.length
  const segments = quality.segments
  const wires = makeThreads(edgeCount, segments)
  const state = net(web, wires)
  const random = rng(11)
  const run = traffic(state, random)
  const seed = (() => {
    let best = BLOCKS
    let bestD = Infinity
    web.far.forEach(({ group, u, v }, j) => {
      if (group !== HERO) return
      const d = Math.hypot(u - SEED.u, v - SEED.v)
      if (d < bestD) {
        bestD = d
        best = BLOCKS + j
      }
    })
    return best
  })()
  const phases = Float32Array.from({ length: edgeCount }, () => random() * 6.28)

  // The dust: blocks and far nodes in one draw.
  const dustBuffer = gl.createBuffer()
  const dustVao = gl.createVertexArray()
  gl.bindVertexArray(dustVao)
  gl.bindBuffer(gl.ARRAY_BUFFER, dustBuffer)
  for (const [location, size, offset] of [
    [A_HOME, 3, 0],
    [A_NORMAL, 3, 3],
    [A_NODE, 1, 6],
    [A_SEED, 4, 7],
  ]) {
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(
      location,
      size,
      gl.FLOAT,
      false,
      PARTICLE * 4,
      offset * 4
    )
  }

  // The threads: one dynamic buffer read at three offsets (the point, the
  // one before, the one after), a static one and the indices.
  const { info, index } = ribbon(edgeCount, segments)
  const points = new Float32Array(edgeCount * pairs(segments) * 2 * FLOATS)
  const pointBuffer = gl.createBuffer()
  const infoBuffer = gl.createBuffer()
  const indexBuffer = gl.createBuffer()
  const threadVao = gl.createVertexArray()
  gl.bindVertexArray(threadVao)
  gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, points.byteLength, gl.DYNAMIC_DRAW)
  const pair = 2 * FLOATS * 4
  for (const [location, offset] of [
    [T_PREV, 0],
    [T_POINT, pair],
    [T_NEXT, 2 * pair],
  ]) {
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, 4, gl.FLOAT, false, FLOATS * 4, offset)
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, infoBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, info, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(T_INFO)
  gl.vertexAttribPointer(T_INFO, 3, gl.FLOAT, false, 12, 0)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW)
  // The threads laid this frame go first in the buffers, one slot each:
  // only those are uploaded and drawn.
  const perThread = segments * 6
  const perSlot = pairs(segments) * 2 * FLOATS
  let drawn = 0
  // The finish and the glow draw one triangle from gl_VertexID.
  const emptyVao = gl.createVertexArray()
  gl.bindVertexArray(null)

  // Per node: position and size, then heat and turn. Per thread: width,
  // visibility and length, then the head of what runs on it.
  const nodeTexture = dataTexture(gl, nodes, 2)
  const edgeTexture = dataTexture(gl, edgeCount, 2)

  // The scene's own buffer for the finish, and the glow's two at a
  // quarter, all sized with the canvas.
  const scene = quality.post ? target(gl, true) : null
  const glowA = glows ? target(gl, false) : null
  const glowB = glows ? target(gl, false) : null

  let linked = false
  let dustAt!: Uniforms<typeof DUST_UNIFORMS>
  let threadAt!: Uniforms<typeof THREAD_UNIFORMS>
  let finishAt: Uniforms<typeof FINISH_UNIFORMS> | null = null
  let downAt: Uniforms<typeof DOWN_UNIFORMS> | null = null
  let blurAt: Uniforms<typeof BLUR_UNIFORMS> | null = null
  let colors: Palette = palette(read)
  let width = 0
  let height = 0
  let dpr = 1
  let count = 0
  // The hero's dust drawn: all of it until a step down draws fewer a block.
  let heroDrawn = Infinity

  const blocks = new Float32Array(BLOCKS * 16)
  const form = new Float32Array(BLOCKS)
  const splashed = splashes()
  const from = new Float32Array(3)
  // Per block: its lean toward the pointer (x, y) and how fast it turns.
  const lean = new Float32Array(BLOCKS * 4)
  const blockPhases = Array.from(
    { length: BLOCKS },
    () => random() * 2 * Math.PI
  )
  const projection = new Float32Array(16)
  const view = new Float32Array(16)
  const viewProj = new Float32Array(16)

  // Per node: world position, how far a thread stops short of it, its
  // threads' width there, the lit (eased) and its step out of the text.
  const world = new Float32Array(nodes * 3)
  const radius = new Float32Array(nodes)
  const widthAt = new Float32Array(nodes).fill(1)
  const litEased = new Float32Array(nodes)
  const out = new Float32Array(nodes * 2)
  const step = new Float32Array(2)
  const ends = new Float32Array(6)
  const masks = new Float32Array(MASKS * 4)
  const zones: Zone[] = []
  // Per group: its far nodes (the first's index among them, how many), where
  // its dust starts in the buffer and how much there is, and whether a node
  // of it is near the screen this frame.
  const members = Array.from({ length: FOOTER + 1 }, (_, g) => {
    const first = web.far.findIndex((f) => f.group === g)
    const n = web.far.filter((f) => f.group === g).length
    return [Math.max(first, 0), n] as const
  })
  const dustFrom = new Int32Array(FOOTER + 1)
  const dustCount = new Int32Array(FOOTER + 1)
  const inView = new Uint8Array(FOOTER + 1)
  // Per far node, how much it lags the scroll by its depth.
  const lag = Float32Array.from(
    web.far,
    (f) => LAG * clamp(-f.z / LAG_DEPTH, 0, 1)
  )

  // This frame's boxes of the chapters' rails and sections.
  const railBoxes: DOMRect[] = []
  const sectionBoxes: DOMRect[] = []
  // Per group: whether it is on the page. Per chapter slot: how far its
  // block has come (0–1) and whether it has landed; per block, the same
  // way, 0 for a block that stays in the logo.
  const shown = new Uint8Array(FOOTER + 1)
  const toRail = new Float32Array(CHAPTERS)
  const landed = new Uint8Array(CHAPTERS)
  const away = new Float32Array(BLOCKS)
  const slotOf = Array.from({ length: BLOCKS }, (_, i) =>
    (CHAPTER_BLOCKS as readonly number[]).indexOf(i)
  )
  let footerCrawled = false
  const ALL_BLOCKS = Array.from({ length: BLOCKS }, (_, i) => i)

  // The pointer (mouse or pen) in client coordinates: for the parallax,
  // the runner, the pluck, the parting and the lean; its speed (0–1).
  const pointer = { x: 0, y: 0, inside: false, last: -Infinity, speed: 0 }
  const before = { x: 0, y: 0 }
  // The pointer on the plane, a little after it, and how hard it pushes.
  const near = { x: 0, y: 0 }
  let push = 0
  const viewer: Viewer = { width: 1, height: 1, pointer: null }
  // A press that may become a tap, the tap the next frame resolves, and
  // how many taps sent packets (`data-taps` on the canvas, for e2e).
  const press = { id: -1, x: 0, y: 0, at: 0 }
  const tapped = { x: 0, y: 0, pending: false }
  let taps = 0
  let shownTaps = 0
  let camera = { x: 0, y: 0 }

  let frame = 0
  let last = -1
  let drawnAt = -1
  let start = -1
  let ready = false
  let failed = false
  let laying = 0
  let crawled = false
  let indexed = false
  let shownReadout = ""

  function read(token: string) {
    return getComputedStyle(canvas).getPropertyValue(token)
  }

  const fail = (reason: string) => {
    if (failed) return
    failed = true
    pause()
    onFail(reason)
  }

  // The page now, each part in CSS pixels from its top left. The hero: its
  // size, its logo square and its text; without the page's anchors, the
  // canvas as the hero. A chapter: its section, its rail and the box all
  // its text takes (the web keeps to the edges and the gaps between
  // chapters). The footer: its logo square and its text.
  function pageFrame(): PageFrame {
    const heroElement = document.querySelector(HERO_WEB)
    const hero = heroElement?.getBoundingClientRect()
    const w = hero?.width || canvas.clientWidth || 1
    const h = hero?.height || canvas.clientHeight || 1
    const left = hero?.left ?? 0
    const top = hero?.top ?? 0
    const textOf = (root: ParentNode, l: number, t: number) =>
      [...root.querySelectorAll(TEXT)].map((element) =>
        toRect(element.getBoundingClientRect(), l, t)
      )
    find(Infinity)
    const chapters = sections.map((section, s): Frame => {
      const box = section.getBoundingClientRect()
      const text = textOf(section, box.left, box.top)
      return {
        width: box.width || 1,
        height: box.height || 1,
        logo: toRect(railBoxOf(s), box.left, box.top),
        text: text.length
          ? [
              text.reduce((u, r) => ({
                left: Math.min(u.left, r.left),
                top: Math.min(u.top, r.top),
                right: Math.max(u.right, r.right),
                bottom: Math.max(u.bottom, r.bottom),
              })),
            ]
          : [],
      }
    })
    const footerBox = footer?.getBoundingClientRect()
    const anchor = footerAnchor?.getBoundingClientRect()
    return {
      view: {
        width: canvas.clientWidth || 1,
        height: canvas.clientHeight || 1,
      },
      hero: {
        width: w,
        height: h,
        logo: toRect(heroLogo(w, h), left, top),
        text: heroElement ? textOf(heroElement, left, top) : [],
      },
      chapters,
      footer:
        footer && footerBox?.height && anchor?.width
          ? {
              width: footerBox.width,
              height: footerBox.height,
              logo: toRect(anchor, footerBox.left, footerBox.top),
              text: textOf(footer, footerBox.left, footerBox.top),
            }
          : null,
    }
  }

  // The page's elements, again once FIND_MS has passed since the last
  // look or one of them has left the page.
  function find(now: number) {
    const gone = (list: Element[]) => list.some((e) => !e.isConnected)
    if (
      now - foundAt < FIND_MS &&
      !gone(texts) &&
      !gone(rails) &&
      (!footerAnchor || footerAnchor.isConnected)
    ) {
      return
    }
    foundAt = Number.isFinite(now) ? now : -Infinity
    texts = [...document.querySelectorAll(TEXT)]
    rails = []
    sections = []
    for (const rail of document.querySelectorAll(RAIL)) {
      const section = rail.closest("section")
      if (!section || rails.length >= CHAPTERS) continue
      rails.push(rail)
      sections.push(section)
    }
    footerAnchor = document.querySelector(FOOTER_ANCHOR)
    footer = footerAnchor?.closest("footer") ?? null
  }

  // A chapter's rail, measured; an empty box when it isn't on the page.
  function railBoxOf(s: number): Box {
    return rails[s]?.getBoundingClientRect() ?? new DOMRect()
  }

  // The dust of each group, one after another: the blocks and the hero's
  // far nodes, then each chapter's and the footer's. A group with no node
  // near the screen isn't drawn.
  function* groupDust() {
    const parts: Float32Array[] = []
    for (let g = HERO; g <= FOOTER; g++) {
      const [first, n] = members[g]
      const part =
        g === HERO
          ? yield* dust(BLOCKS, quality.perBlock, n, quality.perFar)
          : yield* dust(0, 0, n, quality.perFar, undefined, BLOCKS + first)
      dustFrom[g] = parts.reduce((sum, p) => sum + p.length, 0) / PARTICLE
      dustCount[g] = part.length / PARTICLE
      parts.push(part)
    }
    const out = new Float32Array(parts.reduce((sum, p) => sum + p.length, 0))
    let at = 0
    for (const part of parts) {
      out.set(part, at)
      at += part.length
    }
    return out
  }

  // Lays the dust in slices between tasks, then hands it to the GPU.
  async function layDust() {
    const id = ++laying
    const slices = groupDust()
    let slice = slices.next()
    while (!slice.done) {
      await new Promise((resolve) => setTimeout(resolve))
      if (id !== laying) return
      slice = slices.next()
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, dustBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, slice.value, gl.STATIC_DRAW)
    count = slice.value.length / PARTICLE
  }

  function resize() {
    width = Math.max(1, Math.round(canvas.clientWidth))
    height = Math.max(1, Math.round(canvas.clientHeight))
    dpr = Math.min(window.devicePixelRatio || 1, live.dpr)
    const w = Math.round(width * dpr)
    const h = Math.round(height * dpr)
    // Setting the size, even the same, clears the canvas.
    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w
      canvas.height = h
    }
    if (scene) sizeTarget(gl, scene, w, h, hdr)
    const qw = Math.max(1, Math.ceil(w / 4))
    const qh = Math.max(1, Math.ceil(h / 4))
    if (glowA) sizeTarget(gl, glowA, qw, qh, hdr)
    if (glowB) sizeTarget(gl, glowB, qw, qh, hdr)
    redraw()
  }

  // A paused scene that has drawn draws again at once, at its last time.
  function redraw() {
    if (!frame && ready) draw(drawnAt, 0)
  }

  const locate = <T extends readonly string[]>(
    program: WebGLProgram,
    names: T
  ) =>
    Object.fromEntries(
      names.map((name) => [name, gl.getUniformLocation(program, name)])
    ) as Uniforms<T>

  // Whether the programs are linked; fails the scene if one can't be.
  function link() {
    if (linked) return true
    if (
      parallel &&
      programs.some(
        (p) => !gl.getProgramParameter(p, parallel.COMPLETION_STATUS_KHR)
      )
    ) {
      return false
    }
    if (programs.some((p) => !gl.getProgramParameter(p, gl.LINK_STATUS))) {
      fail("shaders didn't link")
      return false
    }
    linked = true
    dustAt = locate(dustProgram, DUST_UNIFORMS)
    gl.useProgram(dustProgram)
    gl.uniform1i(dustAt.uNodes, UNIT_NODES)
    threadAt = locate(threadProgram, THREAD_UNIFORMS)
    gl.useProgram(threadProgram)
    gl.uniform1i(threadAt.uEdges, UNIT_EDGES)
    if (finishProgram) {
      finishAt = locate(finishProgram, FINISH_UNIFORMS)
      gl.useProgram(finishProgram)
      gl.uniform1i(finishAt.uScene, UNIT_SCENE)
      gl.uniform1i(finishAt.uGlow, UNIT_GLOW)
    }
    if (downProgram && blurProgram) {
      downAt = locate(downProgram, DOWN_UNIFORMS)
      gl.useProgram(downProgram)
      gl.uniform1i(downAt.uScene, UNIT_SCENE)
      blurAt = locate(blurProgram, BLUR_UNIFORMS)
      gl.useProgram(blurProgram)
      gl.uniform1i(blurAt.uSource, UNIT_SCENE)
    }
    return true
  }

  // The hero's logo square, or where `lite` puts it when there is none.
  function heroLogo(w = width, h = height): Box {
    const box = document.querySelector(HERO_ANCHOR)?.getBoundingClientRect()
    if (box?.width) return box
    const size = h * 0.6
    return {
      left: w * 0.94 - size,
      top: (h - size) / 2,
      width: size,
      height: size,
    }
  }

  // The text boxes this frame, on screen, into `zones`; returns how many.
  function readText() {
    let n = 0
    for (const element of texts) {
      const r = element.getBoundingClientRect()
      if (!r.width || r.bottom < 0 || r.top > height || n >= MASKS) continue
      zones[n++] = r
    }
    return n
  }

  // A world point to the screen (CSS pixels), into `step`.
  function project(x: number, y: number, z: number) {
    const m = viewProj
    const w = m[3] * x + m[7] * y + m[11] * z + m[15]
    step[0] = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w + 1) * 0.5 * width
    step[1] = (1 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / w) * 0.5 * height
  }

  function writeReadout(text: string) {
    if (text === shownReadout) return
    shownReadout = text
    const element = document.querySelector(READOUT)
    if (element) element.textContent = text
  }

  // Block i stands in a logo (the hero's or the footer's), 0–1: not when
  // it is on its way to a chapter's rail or there.
  const inLogo = (i: number, kF: number) => Math.max(gone(away[i]), come(kF))

  // A block's threads into where it stands go as it sets off (`gone`) and
  // come as it lands (`come`), not across its whole way: a block in flight
  // pulls only the chain.
  const gone = (k: number) => 1 - clamp(k / 0.3)
  const come = (k: number) => clamp((k - 0.6) / 0.4) ** 2

  // How much a thread of `kind` from a to b shows this frame, `k` into the
  // gather and `kF` into the footer. The logo's own come as its blocks form
  // and go with a block that leaves for a chapter. The chain shows to each
  // block that has, the one thread from the logo down. A block's threads
  // into the hero's web show faintly while its dust is still scattered and
  // go as it leaves; into a chapter's web as it lands on the rail, fading
  // as they stretch while the rail rides down a long chapter; into the
  // footer's as they gather there. A group's own threads and the long ones
  // between groups show while the groups are on the page.
  function visible(kind: Kind, a: number, b: number, k: number, kF: number) {
    switch (kind) {
      case Kind.Logo:
        return k * Math.min(inLogo(a, kF), inLogo(b, kF))
      case Kind.Chain:
        return Math.max(
          away[b] * (1 - kF),
          k * Math.min(inLogo(a, kF), inLogo(b, kF))
        )
      case Kind.Attach: {
        const g = web.group[b]
        if (g === HERO) return lerp(0.25, 1, k) * gone(away[a]) * gone(kF)
        if (g === FOOTER) return come(kF)
        const l = Math.hypot(
          state.sx[b] - state.sx[a],
          state.sy[b] - state.sy[a]
        )
        return come(away[a]) * gone(kF) * clamp(2 - l / (STRETCH * height))
      }
      case Kind.Link:
        return linkShows(web.group[a], web.group[b], shown) ? 1 : 0
      default:
        return shown[web.group[a]]
    }
  }

  // The scene to the canvas: its dust, its threads over it, the finish.
  function render(t: number, maskK: number, leave: number) {
    const w = canvas.width
    const h = canvas.height
    const tone = scene && hdr ? 0 : 1
    if (scene) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, scene.framebuffer)
      gl.clearColor(0, 0, 0, 0)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.clearColor(...colors.surface, 1)
    }
    gl.viewport(0, 0, w, h)
    gl.enable(gl.DEPTH_TEST)
    gl.depthMask(true)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.useProgram(dustProgram)
    gl.uniformMatrix4fv(dustAt.uViewProj, false, viewProj)
    gl.uniformMatrix4fv(dustAt.uBlock, false, blocks)
    gl.uniform1fv(dustAt.uForm, form)
    gl.uniform4fv(dustAt.uSplash, splashed.at)
    gl.uniform1fv(dustAt.uSplashA, splashed.amp)
    gl.uniform1f(dustAt.uTime, t)
    gl.uniform1f(dustAt.uScale, (h * 0.5) / Math.tan(FOV / 2))
    gl.uniform1f(dustAt.uSizeK, sizeK(live.perBlock))
    gl.uniform1f(dustAt.uDpr, dpr)
    gl.uniform1f(dustAt.uPush, push)
    gl.uniform2f(dustAt.uRes, w, h)
    gl.uniform2f(dustAt.uPointer, pointer.x * dpr, (height - pointer.y) * dpr)
    gl.uniform3fv(dustAt.uKey, KEY)
    gl.uniform3fv(dustAt.uSteel, colors.steel)
    gl.uniform3fv(dustAt.uRim, colors.rim)
    gl.uniform3fv(dustAt.uFlash, colors.flash)
    gl.uniform1f(dustAt.uTone, tone)
    gl.uniform1f(dustAt.uLeave, leave)
    gl.uniform1f(dustAt.uViewH, VIEW_H)
    gl.bindVertexArray(dustVao)
    gl.drawArrays(
      gl.POINTS,
      dustFrom[HERO],
      Math.min(dustCount[HERO], heroDrawn)
    )
    for (let g = HERO + 1; g <= FOOTER; g++) {
      if (inView[g]) gl.drawArrays(gl.POINTS, dustFrom[g], dustCount[g])
    }

    // The threads over the dust, not into the depth: added in the dark,
    // blended over (premultiplied) in the light.
    gl.depthMask(false)
    gl.enable(gl.BLEND)
    if (colors.dark) gl.blendFunc(gl.ONE, gl.ONE)
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(threadProgram)
    gl.uniformMatrix4fv(threadAt.uViewProj, false, viewProj)
    gl.uniform2f(threadAt.uRes, w, h)
    gl.uniform1f(threadAt.uDpr, dpr)
    gl.uniform1f(threadAt.uFocal, projection[5] * h * 0.5)
    gl.uniform4fv(threadAt.uMask, masks)
    gl.uniform1f(threadAt.uMaskK, maskK)
    gl.uniform1f(threadAt.uTone, tone)
    gl.uniform1f(threadAt.uDark, colors.dark ? 1 : 0)
    gl.uniform1f(threadAt.uLineAlpha, LINE_ALPHA)
    gl.uniform3fv(threadAt.uLine, colors.line)
    gl.uniform3fv(threadAt.uPrimary, colors.flash)
    gl.uniform1f(threadAt.uFade, 1 - clamp(leave / 0.6))
    gl.bindVertexArray(threadVao)
    if (drawn) {
      gl.drawElements(gl.TRIANGLES, drawn * perThread, gl.UNSIGNED_SHORT, 0)
    }
    gl.disable(gl.BLEND)
    gl.depthMask(true)
    gl.disable(gl.DEPTH_TEST)

    if (scene && finishProgram && finishAt) {
      gl.bindVertexArray(emptyVao)
      // The glow, dark theme only: down to a quarter, across, then down.
      const down = downAt
      const blur = blurAt
      const glowing =
        colors.dark && live.glow > 0 && glowA && glowB && down && blur
      if (glowing) {
        gl.activeTexture(gl.TEXTURE0 + UNIT_SCENE)
        gl.bindTexture(gl.TEXTURE_2D, scene.texture)
        gl.bindFramebuffer(gl.FRAMEBUFFER, glowA.framebuffer)
        gl.viewport(0, 0, glowA.width, glowA.height)
        gl.useProgram(downProgram)
        gl.uniform2f(down.uTexel, 1 / w, 1 / h)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        gl.useProgram(blurProgram)
        for (const [from, to, x, y] of [
          [glowA, glowB, 1, 0],
          [glowB, glowA, 0, 1],
        ] as const) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, to.framebuffer)
          gl.bindTexture(gl.TEXTURE_2D, from.texture)
          gl.uniform2f(blur.uStep, x / from.width, y / from.height)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, w, h)
      gl.useProgram(finishProgram)
      gl.activeTexture(gl.TEXTURE0 + UNIT_SCENE)
      gl.bindTexture(gl.TEXTURE_2D, scene.texture)
      gl.activeTexture(gl.TEXTURE0 + UNIT_GLOW)
      // Without a glow the scene stands in, at no weight.
      gl.bindTexture(gl.TEXTURE_2D, (glowing ? glowA : scene).texture)
      gl.uniform1f(finishAt.uGlowK, glowing ? live.glow * GLOW_GAIN : 0)
      gl.uniform3fv(finishAt.uSurface, colors.surface)
      gl.uniform2f(finishAt.uSize, w, h)
      gl.uniform1f(finishAt.uTone, 1 - tone)
      gl.uniform1f(finishAt.uVignette, colors.dark ? VIGNETTE : 0)
      gl.uniform1f(finishAt.uGrain, GRAIN)
      gl.uniform1f(finishAt.uTime, t)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    gl.bindVertexArray(null)
    // Resizing binds the targets on the active unit: not the data's.
    gl.activeTexture(gl.TEXTURE0)
  }

  // The page is gone: the last frame's scene, blown off.
  function drawLeaving(now: number) {
    const lv = clamp((now - leaveAt) / LEAVE_MS)
    render(lastT + (now - leaveAt) / 1000, lastMask, lv)
    const done = leaveDone
    if (lv >= 1 && done) queueMicrotask(done)
    return true
  }

  function draw(now: number, dt: number) {
    if (!link() || !count) return false
    if (leaveAt >= 0) return drawLeaving(now)
    if (start < 0) start = now
    const elapsed = now - start
    const t = elapsed / 1000
    const dts = Math.min(dt / 1000, MAX_STEP)
    const phase = intro(elapsed)
    const viewport: Viewport = { width, height }

    // Reads first (the page's boxes), writes last (the readout).
    find(now)
    const logo = heroLogo()
    const heroBox = document.querySelector(HERO_WEB)?.getBoundingClientRect()
    const zoneCount = readText()
    const chapters = rails.length
    for (let s = 0; s < chapters; s++) {
      railBoxes[s] = rails[s].getBoundingClientRect()
      sectionBoxes[s] = sections[s].getBoundingClientRect()
    }
    const footerBox = footer?.getBoundingClientRect()
    const footerLogo = footerAnchor?.getBoundingClientRect()
    const scrolled = window.scrollY
    // Which parts of the page are on it; how far each chapter's block has
    // come to its rail and the blocks into the footer's logo.
    shown[HERO] = 1
    for (let s = 0; s < CHAPTERS; s++) {
      shown[chapter(s)] = s < chapters ? 1 : 0
      toRail[s] = s < chapters ? arrival(viewport, railBoxes[s]) : 0
    }
    const hasFooter = !!(footerBox?.height && footerLogo?.width)
    shown[FOOTER] = hasFooter ? 1 : 0
    const kF = hasFooter ? gathering(viewport, footerLogo!, footerBox!) : 0
    for (let i = 0; i < BLOCKS; i++) {
      away[i] = slotOf[i] >= 0 ? toRail[slotOf[i]] : 0
    }

    // The intro's crawl, then every node indexed.
    if (phase.crawling && !crawled) {
      crawled = true
      run.crawl(seed)
    }
    if (phase.crawling) run.resume()
    if (phase.indexed && !indexed) {
      indexed = true
      run.indexAll()
    }

    // The camera, a little after the pointer.
    const px = pointer.inside ? pointer.x / width - 0.5 : 0
    const py = pointer.inside ? pointer.y / height - 0.5 : 0
    camera = {
      x: damp(camera.x, px * PARALLAX_X, PARALLAX_RATE, dts),
      y: damp(camera.y, -py * PARALLAX_Y, PARALLAX_RATE, dts),
    }
    perspective(projection, FOV, width / height, 0.1, 200)
    lookAt(
      view,
      [camera.x, camera.y, CAM_D],
      [camera.x * 0.6, camera.y * 0.6, 0]
    )
    multiply(viewProj, projection, view)

    // Lit eases in; heat (light where something landed) cools to nothing.
    const easeLit = 1 - Math.exp(-dts * 5)
    const cool = Math.exp(-dts * 1.3)
    for (let node = 0; node < nodes; node++) {
      litEased[node] = lerp(litEased[node], state.lit[node], easeLit)
      state.heat[node] *= cool
    }

    // The pointer: how hard it parts the dust, and where it is on the
    // plane for the blocks to lean to.
    const moving = pointer.inside && now - pointer.last < POINTER_IDLE
    pointer.speed *= Math.exp(-dts * SPEED_FADE)
    const pushTo = moving ? 0.5 + 0.5 * pointer.speed : 0
    push = damp(push, pushTo, pushTo > push ? PUSH_UP : PUSH_DOWN, dts)
    const onPlane = toWorld(viewport, pointer.x, pointer.y)
    near.x = damp(near.x, onPlane.x, LEAN_FOLLOW, dts)
    near.y = damp(near.y, onPlane.y, LEAN_FOLLOW, dts)

    // The blocks: from the spread into the logo, turned less as they land,
    // then breathing in place, leaning to the pointer once they have. A lit
    // block half forms before the gather. A chapter's block flies from the
    // logo to its rail, turning over on the way; at the end all of them
    // gather into the footer's logo.
    const k = phase.gather
    const nodeData = nodeTexture.data
    for (let i = 0; i < BLOCKS; i++) {
      const slot = gatherSlot(viewport, logo, i, k)
      let x = slot.x
      // A logo scrolled far above: the block waits just over the viewport.
      let y = Math.min(slot.y, ABOVE)
      let scale = slot.scale
      let rx = lerp(-0.1 - t * 0.012, -0.26, k)
      let ry = lerp(0.16 + t * 0.02, 0.36, k)
      let rz = 0
      let z = lerp(-1.5 + (i % 3) * 0.8, 0, k)
      const kc = away[i]
      if (kc > 0) {
        const to = railSlot(viewport, railBoxes[slotOf[i]])
        x = lerp(x, to.x, kc)
        y = lerp(y, to.y, kc)
        scale = lerp(scale, to.scale, kc)
        rx = lerp(rx, -0.3 + Math.sin(t * 0.7 + i) * 0.08, kc)
        ry = lerp(ry, 0.45 + Math.sin(t * 0.5 + i) * 0.35, kc)
        rz = lerp(rz, Math.sin(t * 0.35 + i) * 0.25, kc)
        // The turn over on the way, done once it lands.
        const arc = Math.sin(Math.PI * kc)
        z += arc * 2.2
        rx += arc * 1.2
        ry += (1 - (1 - kc) ** 3) * Math.PI * (1 - kc)
      }
      if (kF > 0) {
        const to = logoSlot(viewport, footerLogo!, i)
        x = lerp(x, to.x, kF)
        y = lerp(y, to.y, kF)
        scale = lerp(scale, to.scale, kF)
        rx = lerp(rx, -0.22, kF)
        ry = lerp(ry, 0.3, kF)
        rz = lerp(rz, 0, kF)
        z += Math.sin(Math.PI * kF) * 4
      }
      z += Math.sin(t * 0.9 + blockPhases[i]) * 0.12 * k * scale
      rx += Math.sin(t * 0.6 + blockPhases[i]) * 0.03 * k
      const dx = near.x - x
      const dy = near.y - y
      const close =
        Math.exp(-(dx * dx + dy * dy) / (scale ** 2 * LEAN_REACH)) * push * k
      const o = i * 4
      const toX = clamp(-dy * LEAN, -LEAN_MAX, LEAN_MAX) * close
      const toY = clamp(dx * LEAN, -LEAN_MAX, LEAN_MAX) * close
      lean[o + 2] +=
        ((toX - lean[o]) * LEAN_STIFF - lean[o + 2] * LEAN_DAMP) * dts
      lean[o + 3] +=
        ((toY - lean[o + 1]) * LEAN_STIFF - lean[o + 3] * LEAN_DAMP) * dts
      lean[o] += lean[o + 2] * dts
      lean[o + 1] += lean[o + 3] * dts
      z += close * scale * 0.8
      compose(
        blocks,
        i * 16,
        [x, y, z],
        [rx + lean[o], ry + lean[o + 1], rz],
        scale
      )
      form[i] = Math.max(k, litEased[i] * 0.45)
      world[i * 3] = x
      world[i * 3 + 1] = y
      world[i * 3 + 2] = z
      radius[i] = scale * 0.8
      widthAt[i] = lerp(0.62, 1, k)
      project(x, y, z)
      state.sx[i] = step[0]
      state.sy[i] = step[1]
    }

    // A chapter's block that lands blows its dust off, and the crawler
    // comes down the chain to it, then crawls the chapter's web.
    for (let s = 0; s < CHAPTERS; s++) {
      if (toRail[s] > 0.985 && !landed[s]) {
        landed[s] = 1
        const b = CHAPTER_BLOCKS[s]
        state.hit[b] = Math.max(state.hit[b], ARRIVE_SPLASH)
        state.hitFrom[b] = CHAIN[s]
        const e = web.chain[s]
        const t0 = clamp(1 - CHAIN_REACH / state.length[e])
        run.chain(e, CHAIN[s], chapter(s), t0)
      }
      if (toRail[s] < 0.6) landed[s] = 0
    }
    // The footer's web is crawled all over once the blocks have gathered.
    if (kF > 0.85 && !footerCrawled) {
      footerCrawled = true
      run.burst(ALL_BLOCKS, FOOTER)
    }
    if (kF < 0.4) footerCrawled = false

    // The far nodes: where they lie in their part of the page (the hero's
    // drawn in toward the logo as the intro ends), deeper ones lagging the
    // scroll, out of the text once it masks, eased. The hero's lag from the
    // top of the page, the footer's up to the end, a chapter's around the
    // viewport's middle. A chapter not on the page, or a footer, keeps its
    // nodes far off.
    const hl = heroBox?.left ?? 0
    const ht = heroBox?.top ?? 0
    const hw = heroBox?.width || width
    const hh = heroBox?.height || height
    const lx = logo.left + logo.width / 2
    const ly = logo.top + logo.height / 2
    const toEnd = hasFooter
      ? Math.min(Math.max(footerBox!.bottom - height, 0), height)
      : 0
    const ease = 1 - Math.exp(-dts * 5)
    const viewW = VIEW_H * (width / height)
    inView.fill(0)
    for (let j = 0; j < web.far.length; j++) {
      const node = BLOCKS + j
      const f = web.far[j]
      let bx: number
      let by: number
      if (f.group === HERO) {
        bx = lx + (hl + f.u * hw - lx) * phase.spread
        by = ly + (ht + f.v * hh - ly) * phase.spread
        by += lag[j] * Math.min(scrolled, height)
      } else if (!shown[f.group]) {
        bx = width / 2
        by = -10 * height
      } else if (f.group === FOOTER) {
        bx = footerBox!.left + f.u * footerBox!.width
        by = footerBox!.top + f.v * footerBox!.height - lag[j] * toEnd
      } else {
        const r = sectionBoxes[f.group - 1]
        bx = r.left + f.u * r.width
        by = r.top + f.v * r.height
        by += lag[j] * (height / 2 - by)
      }
      if (by > -NEAR && by < height + NEAR) inView[f.group] = 1
      stepOut(bx, by, zones, zoneCount, step)
      out[node * 2] = lerp(out[node * 2], step[0] * phase.mask, ease)
      out[node * 2 + 1] = lerp(out[node * 2 + 1], step[1] * phase.mask, ease)
      const sx = bx + out[node * 2]
      const sy = by + out[node * 2 + 1]
      state.sx[node] = sx
      state.sy[node] = sy
      // Deeper points spread wider, so each stays where it shows.
      const depth = (CAM_D - f.z) / CAM_D
      const x = (sx / width - 0.5) * viewW * depth
      const y = -(sy / height - 0.5) * VIEW_H * depth
      world[node * 3] = x
      world[node * 3 + 1] = y
      world[node * 3 + 2] = f.z
      const o = node * 4
      nodeData[o] = x
      nodeData[o + 1] = y
      nodeData[o + 2] = f.z
      nodeData[o + 3] = f.size
      const o2 = (nodes + node) * 4
      nodeData[o2] = state.heat[node]
      nodeData[o2 + 1] = -0.25 + f.rx + Math.sin(t * 0.4 + node) * 0.1
      nodeData[o2 + 2] = 0.3 + f.ry + t * f.spin
    }

    // The pointer: active a while after it moved, once the intro is done.
    const active =
      phase.done && pointer.inside && now - pointer.last < POINTER_IDLE
    viewer.width = width
    viewer.height = height
    viewer.pointer = active ? pointer : null
    // A tap: the nearest node by where the scene put the nodes this frame.
    if (tapped.pending) {
      tapped.pending = false
      if (phase.done && run.tap(tapped.x, tapped.y, viewer) >= 0) taps++
    }
    run.step(dts, viewer, phase.done)

    // What landed on a block blows its dust off, from the node it came by.
    for (let i = 0; i < BLOCKS; i++) {
      if (!state.hit[i]) continue
      const from3 = state.hitFrom[i] * 3
      for (let c = 0; c < 3; c++) from[c] = world[from3 + c] - world[i * 3 + c]
      splash(splashed, i, t, state.hit[i], blocks, i * 16, from)
      state.hit[i] = 0
    }

    // The threads: ends at the nodes' surfaces, plucked where the pointer
    // crosses them, the wave, the heat they keep, into the buffers.
    const moved = Math.hypot(pointer.x - before.x, pointer.y - before.y)
    const plucking = phase.done && pointer.inside && moved > PLUCK_MOVE
    const toWorldY = VIEW_H / height
    const pvx = (pointer.x - before.x) * toWorldY
    const pvy = -(pointer.y - before.y) * toWorldY
    before.x = pointer.x
    before.y = pointer.y
    const heatDecay = Math.exp(-dts * (phase.done ? 1.5 : 1.1))
    const edgeData = edgeTexture.data
    drawn = 0
    for (let e = 0; e < edgeCount; e++) {
      const edge = web.edges[e]
      const a = edge.a * 3
      const b = edge.b * 3
      let ax = world[a]
      let ay = world[a + 1]
      let az = world[a + 2]
      let bx = world[b]
      let by = world[b + 1]
      let bz = world[b + 2]
      const full = Math.hypot(bx - ax, by - ay, bz - az)
      if (full > 1e-3) {
        const ra = Math.min(radius[edge.a], full * 0.45) / full
        const rb = Math.min(radius[edge.b], full * 0.45) / full
        const dx = bx - ax
        const dy = by - ay
        const dz = bz - az
        ax += dx * ra
        ay += dy * ra
        az += dz * ra
        bx -= dx * rb
        by -= dy * rb
        bz -= dz * rb
      }
      const length = Math.max(Math.hypot(bx - ax, by - ay, bz - az), 1e-3)
      state.length[e] = length
      const alpha = visible(edge.kind, edge.a, edge.b, k, kF)
      state.alpha[e] = alpha

      // Off screen or out of sight: not laid, not drawn.
      wires.cool[e] -= dts
      const sxa = state.sx[edge.a]
      const sxb = state.sx[edge.b]
      const sya = state.sy[edge.a]
      const syb = state.sy[edge.b]
      if (
        alpha < 0.002 ||
        Math.max(sxa, sxb) < -CULL ||
        Math.min(sxa, sxb) > width + CULL ||
        Math.max(sya, syb) < -CULL ||
        Math.min(sya, syb) > height + CULL
      ) {
        continue
      }
      if (plucking && alpha > 0.2) {
        const sax = state.sx[edge.a]
        const say = state.sy[edge.a]
        const sx = state.sx[edge.b] - sax
        const sy = state.sy[edge.b] - say
        const l2 = sx * sx + sy * sy
        if (l2 > 16) {
          const u = clamp(
            ((pointer.x - sax) * sx + (pointer.y - say) * sy) / l2,
            0.04,
            0.96
          )
          const qx = sax + sx * u - pointer.x
          const qy = say + sy * u - pointer.y
          if (qx * qx + qy * qy < PLUCK_RADIUS ** 2) {
            const at = Math.round(u * segments)
            const nl = Math.hypot(ay - by, bx - ax) || 1
            const across = ((ay - by) * pvx + (bx - ax) * pvy) / nl
            pluck(wires, e, at, clamp(across * 9, -6, 6))
            if (wires.cool[e] <= 0) {
              wires.cool[e] = 0.3
              run.pulses(e, at, clamp(0.6 + moved / 60, 0, 1.1))
            }
          }
        }
      }
      wave(wires, e, dts, length)
      const o = e * (segments + 1)
      for (let m = 0; m <= segments; m++) wires.heat[o + m] *= heatDecay

      let base = edge.base * Math.min(litEased[edge.a], litEased[edge.b])
      if (edge.kind === Kind.Logo || edge.kind === Kind.Chain) {
        base *=
          (0.82 + 0.18 * Math.sin(t * 1.3 + phases[e])) *
          clamp(5 / length, edge.kind === Kind.Chain ? 0.6 : 0.22, 1)
      }
      ends[0] = ax
      ends[1] = ay
      ends[2] = az
      ends[3] = bx
      ends[4] = by
      ends[5] = bz
      const slot = drawn++
      lay(wires, e, ends, base, points, slot)
      edgeData[slot * 4] =
        edge.width * Math.min(widthAt[edge.a], widthAt[edge.b])
      edgeData[slot * 4 + 1] = alpha
      edgeData[slot * 4 + 2] = length
      edgeData[(edgeCount + slot) * 4] = state.head[e * 2]
      edgeData[(edgeCount + slot) * 4 + 1] = state.head[e * 2 + 1]
    }

    // The text boxes for the threads, in device pixels from the bottom.
    masks.fill(-1)
    for (let i = 0; i < zoneCount; i++) {
      const r = zones[i]
      masks[i * 4] = r.left * dpr
      masks[i * 4 + 1] = (height - r.bottom) * dpr
      masks[i * 4 + 2] = r.right * dpr
      masks[i * 4 + 3] = (height - r.top) * dpr
    }

    // To the GPU: one upload each.
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
    if (drawn) gl.bufferSubData(gl.ARRAY_BUFFER, 0, points, 0, drawn * perSlot)
    gl.activeTexture(gl.TEXTURE0 + UNIT_NODES)
    nodeTexture.upload()
    gl.activeTexture(gl.TEXTURE0 + UNIT_EDGES)
    edgeTexture.upload(drawn)

    lastT = t
    lastMask = phase.mask
    render(t, phase.mask, 0)

    writeReadout(readout(phase, run.lit, web.heroNodes))
    if (taps !== shownTaps) {
      shownTaps = taps
      canvas.dataset.taps = String(taps)
    }
    return true
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick)
    // A frame cap below the display's: skip frames that come too soon.
    if (live.fps < 60 && now - drawnAt < 1000 / live.fps - 3) return
    const drawn = draw(now, last < 0 ? 0 : now - last)
    last = now
    if (!drawn) return
    drawnAt = now
    if (leaveAt < 0) onFrame(now)
    if (!ready) {
      ready = true
      onReady()
    }
  }

  const move = (event: PointerEvent) => {
    // Touch scrolls the page: no parallax, parting or pluck under a finger.
    if (event.pointerType === "touch") return
    if (pointer.inside) {
      const moved = Math.hypot(
        event.clientX - pointer.x,
        event.clientY - pointer.y
      )
      pointer.speed = Math.min(1, pointer.speed + moved / SPEED_PX)
    } else {
      before.x = event.clientX
      before.y = event.clientY
    }
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.inside = true
    pointer.last = performance.now()
  }
  const leave = (event: PointerEvent) => {
    if (!event.relatedTarget) pointer.inside = false
  }
  // Only noted here: no layout is read and nothing is prevented, so the
  // page scrolls and links work as they would without the scene. A second
  // finger cancels the press.
  const down = (event: PointerEvent) => {
    press.id = -1
    if (!event.isPrimary || event.button !== 0) return
    const target = event.target
    if (target instanceof Element && target.closest(NOT_WEB)) return
    press.id = event.pointerId
    press.x = event.clientX
    press.y = event.clientY
    press.at = event.timeStamp
  }
  const up = (event: PointerEvent) => {
    if (event.pointerId !== press.id) return
    press.id = -1
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y)
    if (moved > TAP_SLOP || event.timeStamp - press.at > TAP_MS) return
    tapped.x = event.clientX
    tapped.y = event.clientY
    tapped.pending = true
  }
  const cancel = (event: PointerEvent) => {
    if (event.pointerId === press.id) press.id = -1
  }
  // Not preventing the default leaves the context lost for good.
  const lost = () => fail("WebGL context lost")
  const resized = new ResizeObserver(resize)
  // The theme is a class on <html> (index.html, app/providers).
  const themed = new MutationObserver(() => {
    colors = palette(read)
    redraw()
  })

  resize()
  void layDust()
  resized.observe(canvas)
  themed.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  canvas.addEventListener("webglcontextlost", lost)
  window.addEventListener("pointermove", move, { passive: true })
  window.addEventListener("pointerout", leave, { passive: true })
  window.addEventListener("pointerdown", down, { passive: true })
  window.addEventListener("pointerup", up, { passive: true })
  window.addEventListener("pointercancel", cancel, { passive: true })

  function pause() {
    cancelAnimationFrame(frame)
    frame = 0
    last = -1
  }

  return {
    play: () => {
      if (!frame && !failed) frame = requestAnimationFrame(tick)
    },
    pause,
    lower: (next) => {
      live = next
      heroDrawn = rounds(
        BLOCKS,
        quality.perBlock,
        members[HERO][1],
        quality.perFar,
        next.perBlock
      )
      resize()
    },
    leave: (done) => {
      if (!ready || failed || leaveAt >= 0) {
        done()
        return
      }
      leaveAt = performance.now()
      // A hidden tab draws no frames, a lost context stops them: `done`
      // comes then by the clock.
      const finish = () => {
        if (leaveDone !== finish) return
        leaveDone = null
        clearTimeout(late)
        done()
      }
      const late = setTimeout(finish, LEAVE_MS + 200)
      leaveDone = finish
      if (!frame) frame = requestAnimationFrame(tick)
    },
    destroy: () => {
      pause()
      laying++
      resized.disconnect()
      themed.disconnect()
      canvas.removeEventListener("webglcontextlost", lost)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerout", leave)
      window.removeEventListener("pointerdown", down)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", cancel)
      for (const buffer of [dustBuffer, pointBuffer, infoBuffer, indexBuffer]) {
        gl.deleteBuffer(buffer)
      }
      for (const vao of [dustVao, threadVao, emptyVao]) {
        gl.deleteVertexArray(vao)
      }
      gl.deleteTexture(nodeTexture.texture)
      gl.deleteTexture(edgeTexture.texture)
      for (const t of [scene, glowA, glowB]) if (t) deleteTarget(gl, t)
      for (const shader of shaders) gl.deleteShader(shader)
      for (const program of programs) gl.deleteProgram(program)
      // One WebGL context on the page (ADR-0012): a canvas that left it
      // gives its context back now rather than at garbage collection. Not
      // under StrictMode's rerun, which keeps the canvas and its context.
      if (!canvas.isConnected && !gl.isContextLost()) lose?.loseContext()
    },
  }
}
