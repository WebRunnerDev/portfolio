import { exitProgress, riseShare } from "@/shared/lib/logo-flight"

import { palette, rgb } from "./colors"
import { CELL, lattice, PRESS, pressure, type Pressure } from "./lattice"
import { pitchAt, unproject, type Camera } from "./pitch"
import { prism, VERTEX } from "./prism"
import { COPIES, COPY, rise } from "./rise"
import { FRAGMENT_SHADER, SWELL_SPREAD, VERTEX_SHADER } from "./shaders"

// ADR-0012: DPR 1.5 at most.
const MAX_DPR = 1.5
// The camera's distance in viewport heights: a narrow field of view, so a
// lifted prism grows a little and the walls of leaning ones show.
const DISTANCE = 1.6
// The swell crosses once per period; the pointer's presence fades it.
const SWELL_PERIOD_MS = 10_000
const PRESENCE_MS = 400
// The key light rakes from the top left, 38° high, and slides 25° back and
// forth; the rim light grazes from just under the other side, so it
// catches the walls and edges of leaning prisms more than flat ones.
const LIGHT_AZIMUTH = (-3 * Math.PI) / 4
const LIGHT_ELEVATION = (38 * Math.PI) / 180
const LIGHT_SWAY = (25 * Math.PI) / 180
const LIGHT_PERIOD_MS = 16_000
const RIM_ELEVATION = (-5 * Math.PI) / 180
// The pitched field brings this share of the canvas's width in past each
// side; it never shows past its top (pitch.ts).
const REACH = 0.12
// The depth buffer's range: from NEAR pixels over the canvas, above any
// lift, to past the far edge of the pitched field.
const NEAR = 128
const FAR = 128

const UNIFORMS = [
  "uSize",
  "uDistance",
  "uSwell",
  "uLight",
  "uRim",
  "uSurface",
  "uStep",
  "uEdge",
  "uGlint",
  "uCrest",
  "uLine",
  "uPitch",
  "uPivot",
  "uDepth",
  "uTile",
] as const

const direction = (azimuth: number, elevation: number) => [
  Math.cos(elevation) * Math.cos(azimuth),
  Math.cos(elevation) * Math.sin(azimuth),
  Math.sin(elevation),
]

export type CastLattice = {
  play: () => void
  pause: () => void
  destroy: () => void
}

export type CastLatticeEvents = {
  // Every frame's timestamp once the scene draws (the FPS meter).
  onFrame: (now: number) => void
  // After the first frame is drawn.
  onReady: () => void
  // The shaders didn't link or the context was lost: the scene is done.
  onFail: () => void
  // The hero's logo tiles the rise lands on (`logo-flight-from`).
  tiles: () => Element | null
  // Once, when the copies start to rise on the hero's exit: from then on the
  // header logo's flight waits for them (`data-rise`, index.css › Logo
  // flight). At the top of the page, so nothing on screen jumps.
  onRise: () => void
}

// The Cast Lattice (docs/design-brief.md › Cast Lattice) on `canvas`: a prism
// per lattice cell, all in one instanced draw call on WebGL2. The pointer
// (mouse or pen) presses them up and away on springs; without it a swell
// crosses from left to right. As the hero leaves, the field pitches away and
// seven copies of cells rise into its logo tiles, read from the hero's place
// once a frame, so on touch too. Colors follow the theme's tokens. Shaders
// compile in parallel where the browser can, and the lattice is laid in
// slices, so no long task lands on an input. Draws only while playing.
// Returns null without WebGL2.
export function castLattice(
  canvas: HTMLCanvasElement,
  { onFrame, onReady, onFail, tiles, onRise }: CastLatticeEvents
): CastLattice | null {
  const context = canvas.getContext("webgl2", {
    alpha: false,
    antialias: true,
    depth: true,
  })
  if (!context) return null
  const gl = context
  const parallel = gl.getExtension("KHR_parallel_shader_compile")
  const lose = gl.getExtension("WEBGL_lose_context")

  const program = gl.createProgram()
  const shaders = [
    [gl.VERTEX_SHADER, VERTEX_SHADER],
    [gl.FRAGMENT_SHADER, FRAGMENT_SHADER],
  ].map(([type, source]) => {
    const shader = gl.createShader(type as number)!
    gl.shaderSource(shader, source as string)
    gl.compileShader(shader)
    gl.attachShader(program, shader)
    return shader
  })
  // Not checked until it is done: asking for the status at once waits for
  // the compiler.
  gl.linkProgram(program)

  const vertices = prism()
  const vao = gl.createVertexArray()
  const copyVao = gl.createVertexArray()
  const buffers = [0, 1, 2, 3].map(() => gl.createBuffer())
  const [prismBuffer, cellBuffer, pressBuffer, copyBuffer] = buffers
  const copies = new Float32Array(COPIES * COPY)
  gl.bindVertexArray(vao)
  const attribute = (
    location: number,
    size: number,
    stride: number,
    offset: number,
    divisor: number
  ) => {
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(
      location,
      size,
      gl.FLOAT,
      false,
      stride * 4,
      offset * 4
    )
    gl.vertexAttribDivisor(location, divisor)
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, prismBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
  attribute(0, 4, VERTEX, 0, 0)
  attribute(1, 3, VERTEX, 4, 0)
  gl.bindBuffer(gl.ARRAY_BUFFER, cellBuffer)
  attribute(2, CELL, CELL, 0, 1)
  gl.bindBuffer(gl.ARRAY_BUFFER, pressBuffer)
  attribute(3, PRESS, PRESS, 0, 1)
  // Cells aren't copies: aFly's default for every instance of the field.
  gl.vertexAttrib4f(4, 1, 0, 0, 1)
  gl.bindVertexArray(copyVao)
  gl.bindBuffer(gl.ARRAY_BUFFER, prismBuffer)
  attribute(0, 4, VERTEX, 0, 0)
  attribute(1, 3, VERTEX, 4, 0)
  gl.bindBuffer(gl.ARRAY_BUFFER, copyBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, copies, gl.DYNAMIC_DRAW)
  attribute(2, CELL, COPY, 0, 1)
  attribute(3, PRESS, COPY, CELL, 1)
  attribute(4, 4, COPY, CELL + PRESS, 1)
  gl.bindVertexArray(null)
  gl.enable(gl.DEPTH_TEST)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  let linked = false
  let uniforms!: Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>
  let width = 0
  let height = 0
  let dpr = 1
  // The cells as laid, their springs, and how many there are to draw.
  let press: Pressure | null = null
  let count = 0
  let pressing = false
  let laying = 0
  let laidFor = ""

  // The pointer in client coordinates (none until a mouse or pen moves), and
  // how present it is on the canvas.
  let pointer: { x: number; y: number } | null = null
  let presence = 0
  // The view the hero's timeline sees: below the header's scroll padding.
  let inset = 0
  let rising = false

  let frame = 0
  let last = -1
  let ready = false
  let failed = false

  const fail = () => {
    if (failed) return
    failed = true
    pause()
    onFail()
  }

  function readColors() {
    if (!linked) return
    const style = getComputedStyle(canvas)
    const colors = palette((token) => style.getPropertyValue(token))
    gl.uniform3fv(uniforms.uSurface, colors.surface)
    gl.uniform3fv(uniforms.uStep, colors.step)
    gl.uniform3fv(uniforms.uEdge, colors.edge)
    gl.uniform3fv(uniforms.uGlint, colors.glint)
    gl.uniform3fv(uniforms.uCrest, colors.crest)
    // The logo tiles' own color, as the page paints them.
    const logo = tiles()
    gl.uniform3fv(
      uniforms.uTile,
      logo ? rgb(getComputedStyle(logo).color) : colors.edge
    )
    gl.clearColor(...colors.surface, 1)
  }

  // Lays the lattice for the canvas's size in slices between tasks, then
  // hands it to the GPU. A newer size drops an older laying.
  async function lay() {
    const key = `${width}×${height}`
    if (key === laidFor) return
    laidFor = key
    const id = ++laying
    const cells = lattice(width, height, REACH * width)
    let slice = cells.next()
    while (!slice.done) {
      await new Promise((resolve) => setTimeout(resolve))
      if (id !== laying) return
      slice = cells.next()
    }
    press = pressure(slice.value)
    pressing = false
    gl.bindBuffer(gl.ARRAY_BUFFER, cellBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, slice.value, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, pressBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, press.state, gl.DYNAMIC_DRAW)
    count = slice.value.length / CELL
    if (!frame) draw(last < 0 ? 0 : last, 0)
  }

  function resize() {
    width = Math.max(1, Math.round(canvas.clientWidth))
    height = Math.max(1, Math.round(canvas.clientHeight))
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    inset =
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
      0
    const w = Math.round(width * dpr)
    const h = Math.round(height * dpr)
    // Setting the size, even the same, clears the canvas. Laying goes on
    // anyway: under StrictMode's rerun a new scene finds the canvas already
    // sized by the one before it, with no lattice of its own yet.
    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w
      canvas.height = h
    }
    gl.viewport(0, 0, w, h)
    void lay()
    // A paused scene draws again at once, with the old lattice until the
    // new one is laid.
    if (!frame) draw(last < 0 ? 0 : last, 0)
  }

  // Whether the program is linked; fails the scene if it can't be.
  function link() {
    if (linked) return true
    if (
      parallel &&
      !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)
    ) {
      return false
    }
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      fail()
      return false
    }
    linked = true
    gl.useProgram(program)
    uniforms = Object.fromEntries(
      UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)])
    ) as typeof uniforms
    readColors()
    return true
  }

  // The pointer's place on the pitched field, if it is over the canvas.
  function place(rect: DOMRect, camera: Camera) {
    if (!pointer) return null
    const x = pointer.x - rect.left
    const y = pointer.y - rect.top
    return x >= 0 && y >= 0 && x <= width && y <= height
      ? unproject(camera, x, y)
      : null
  }

  // The copies of the rise, drawn over the field: from the top of the page
  // until the flight takes over, `share` into the hero's exit.
  function lift(
    rect: DOMRect,
    view: { top: number; bottom: number },
    progress: number
  ) {
    const logo = tiles()?.getBoundingClientRect()
    if (!logo?.width) return
    const share = riseShare(logo, rect, view)
    if (!rising && share > 0 && progress === 0) {
      rising = true
      onRise()
    }
    if (!rising || progress <= 0 || progress >= share) return
    rise(
      copies,
      {
        left: logo.left - rect.left,
        top: logo.top - rect.top,
        width: logo.width,
      },
      height,
      progress / share
    )
    gl.bindBuffer(gl.ARRAY_BUFFER, copyBuffer)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, copies)
    gl.uniform2f(uniforms.uPitch, 1, 0)
    gl.uniform2f(uniforms.uSwell, 0, 0)
    gl.clear(gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.bindVertexArray(copyVao)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, vertices.length / VERTEX, COPIES)
    gl.bindVertexArray(vao)
    gl.disable(gl.BLEND)
  }

  function draw(now: number, dt: number) {
    if (!link() || !press || !count) return false
    // Where the hero is, once a frame: its exit pitches the field.
    const rect = canvas.getBoundingClientRect()
    const view = { top: inset, bottom: document.documentElement.clientHeight }
    const progress = exitProgress(rect, view)
    const distance = DISTANCE * height
    const camera = { width, height, distance, pitch: pitchAt(progress) }
    const at = place(rect, camera)
    presence += ((at ? 1 : 0) - presence) * (1 - Math.exp(-dt / PRESENCE_MS))
    if (at || pressing) {
      pressing = press.step(at, dt)
      gl.bindBuffer(gl.ARRAY_BUFFER, pressBuffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, press.state)
    }
    const front =
      -SWELL_SPREAD +
      ((now % SWELL_PERIOD_MS) / SWELL_PERIOD_MS) * (width + 2 * SWELL_SPREAD)
    const azimuth =
      LIGHT_AZIMUTH +
      LIGHT_SWAY * Math.sin((2 * Math.PI * now) / LIGHT_PERIOD_MS)
    const near = distance - NEAR
    const far = distance + height + FAR
    gl.uniform2f(uniforms.uSize, width, height)
    gl.uniform1f(uniforms.uDistance, distance)
    gl.uniform2f(
      uniforms.uDepth,
      (far + near) / (far - near),
      (-2 * far * near) / (far - near)
    )
    gl.uniform2f(uniforms.uSwell, front, 1 - presence)
    gl.uniform2f(
      uniforms.uPitch,
      Math.cos(camera.pitch),
      Math.sin(camera.pitch)
    )
    gl.uniform1f(uniforms.uPivot, height)
    gl.uniform3fv(uniforms.uLight, direction(azimuth, LIGHT_ELEVATION))
    gl.uniform3fv(uniforms.uRim, direction(azimuth + Math.PI, RIM_ELEVATION))
    gl.uniform1f(uniforms.uLine, dpr / 2)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.bindVertexArray(vao)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, vertices.length / VERTEX, count)
    lift(rect, view, progress)
    return true
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick)
    const drawn = draw(now, last < 0 ? 0 : now - last)
    last = now
    if (!drawn) return
    onFrame(now)
    if (!ready) {
      ready = true
      onReady()
    }
  }

  const move = (event: PointerEvent) => {
    // Touch scrolls the page: touch screens get the swell.
    if (event.pointerType === "touch") return
    pointer = { x: event.clientX, y: event.clientY }
  }
  const leave = (event: PointerEvent) => {
    if (!event.relatedTarget) pointer = null
  }
  // Not preventing the default leaves the context lost for good.
  const lost = () => fail()
  const resized = new ResizeObserver(resize)
  // The theme is a class on <html> (index.html, app/providers).
  const themed = new MutationObserver(() => {
    readColors()
    if (!frame) draw(last < 0 ? 0 : last, 0)
  })

  resize()
  resized.observe(canvas)
  themed.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  canvas.addEventListener("webglcontextlost", lost)
  window.addEventListener("pointermove", move, { passive: true })
  window.addEventListener("pointerout", leave, { passive: true })

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
    destroy: () => {
      pause()
      laying++
      resized.disconnect()
      themed.disconnect()
      canvas.removeEventListener("webglcontextlost", lost)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerout", leave)
      for (const buffer of buffers) gl.deleteBuffer(buffer)
      for (const shader of shaders) gl.deleteShader(shader)
      gl.deleteVertexArray(vao)
      gl.deleteVertexArray(copyVao)
      gl.deleteProgram(program)
      // One WebGL context on the page (ADR-0012): a canvas that left it
      // gives its context back now rather than at garbage collection. Not
      // under StrictMode's rerun, which keeps the canvas and its context.
      if (!canvas.isConnected && !gl.isContextLost()) lose?.loseContext()
    },
  }
}
