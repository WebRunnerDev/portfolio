import { palette, type Palette } from "./colors"
import { dust, PARTICLE } from "./dust"
import { intro } from "./intro"
import { CAM_D, FOV, gatherSlot, type Box, type Viewport } from "./layout"
import { compose, damp, lerp, lookAt, multiply, perspective, rng } from "./math"
import { DESKTOP, type Quality } from "./quality"
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
} from "./shaders"

// The page tells the scene where things are through attributes, read once
// a frame (a class or an attribute, not an import, as the logo flight): the
// hero's logo square the blocks gather into, and the hero's crawl readout.
const HERO_ANCHOR = '[data-swarm-anchor="hero"]'
const READOUT = "[data-swarm-readout]"

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

const DUST_UNIFORMS = [
  "uViewProj",
  "uBlock",
  "uForm",
  "uTime",
  "uScale",
  "uSizeK",
  "uMinSize",
  "uKey",
  "uSteel",
  "uRim",
  "uFlash",
  "uTone",
] as const
const FINISH_UNIFORMS = [
  "uScene",
  "uSurface",
  "uSize",
  "uTone",
  "uVignette",
  "uGrain",
  "uTime",
] as const

type Uniforms<T extends readonly string[]> = Record<
  T[number],
  WebGLUniformLocation | null
>

export type Swarm = {
  play: () => void
  pause: () => void
  destroy: () => void
}

export type SwarmEvents = {
  // Every drawn frame's timestamp (the FPS meter).
  onFrame: (now: number) => void
  // After the first frame is drawn: the canvas may fade in.
  onReady: () => void
  // The shaders didn't link or the context was lost: the scene is done.
  onFail: () => void
  // The site's pages on the current Lang, for the crawl readout.
  paths: readonly string[]
}

// The Swarm (ADR-0013, docs/design-brief.md › Главная на Swarm) on a canvas
// fixed over the viewport behind the home page. This first part: the
// logo's seven blocks of dust, which gather from all over the screen into
// the hero's logo square once the scene draws, and the crawl readout in the
// hero. Shaders link in parallel where the browser can and the dust is laid
// in slices, so no long task lands on an input. Draws only while playing.
// Returns null without WebGL2.
export function swarm(
  canvas: HTMLCanvasElement,
  { onFrame, onReady, onFail, paths }: SwarmEvents,
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
  const dustProgram = build(DUST_VERTEX, DUST_FRAGMENT)
  const finishProgram = quality.post
    ? build(FINISH_VERTEX, FINISH_FRAGMENT)
    : null
  const programs = finishProgram ? [dustProgram, finishProgram] : [dustProgram]

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
  // The finish draws one triangle from gl_VertexID: no attributes.
  const emptyVao = gl.createVertexArray()
  gl.bindVertexArray(null)

  // The scene's own buffer for the finish, sized with the canvas.
  const target = quality.post
    ? {
        texture: gl.createTexture(),
        depth: gl.createRenderbuffer(),
        framebuffer: gl.createFramebuffer(),
      }
    : null

  let linked = false
  let dustAt!: Uniforms<typeof DUST_UNIFORMS>
  let finishAt: Uniforms<typeof FINISH_UNIFORMS> | null = null
  let colors: Palette = palette(read)
  let width = 0
  let height = 0
  let dpr = 1
  let count = 0

  const blocks = new Float32Array(BLOCKS * 16)
  const form = new Float32Array(BLOCKS)
  const random = rng(7)
  const phases = Array.from({ length: BLOCKS }, () => random() * 2 * Math.PI)
  const projection = new Float32Array(16)
  const view = new Float32Array(16)
  const viewProj = new Float32Array(16)

  // The pointer (mouse or pen) in client coordinates, for the parallax.
  let pointer: { x: number; y: number } | null = null
  let camera = { x: 0, y: 0 }

  let frame = 0
  let last = -1
  let drawnAt = -1
  let start = -1
  let ready = false
  let failed = false
  let laying = 0
  let readout = ""

  function read(token: string) {
    return getComputedStyle(canvas).getPropertyValue(token)
  }

  const fail = () => {
    if (failed) return
    failed = true
    pause()
    onFail()
  }

  // Lays the dust in slices between tasks, then hands it to the GPU.
  async function lay() {
    const id = ++laying
    const slices = dust(BLOCKS, quality.perBlock)
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

  function sizeTarget(w: number, h: number) {
    if (!target) return
    gl.bindTexture(gl.TEXTURE_2D, target.texture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      hdr ? gl.RGBA16F : gl.RGBA8,
      w,
      h,
      0,
      gl.RGBA,
      hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
      null
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindRenderbuffer(gl.RENDERBUFFER, target.depth)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h)
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      target.texture,
      0
    )
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      target.depth
    )
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  function resize() {
    width = Math.max(1, Math.round(canvas.clientWidth))
    height = Math.max(1, Math.round(canvas.clientHeight))
    dpr = Math.min(window.devicePixelRatio || 1, quality.dpr)
    const w = Math.round(width * dpr)
    const h = Math.round(height * dpr)
    // Setting the size, even the same, clears the canvas.
    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w
      canvas.height = h
    }
    sizeTarget(w, h)
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
      fail()
      return false
    }
    linked = true
    dustAt = locate(dustProgram, DUST_UNIFORMS)
    if (finishProgram) {
      finishAt = locate(finishProgram, FINISH_UNIFORMS)
      gl.useProgram(finishProgram)
      gl.uniform1i(finishAt.uScene, 0)
    }
    return true
  }

  // The hero's logo square, or where `lite` puts it when there is none.
  function heroLogo(): Box {
    const box = document.querySelector(HERO_ANCHOR)?.getBoundingClientRect()
    if (box?.width) return box
    const size = height * 0.6
    return {
      left: width * 0.94 - size,
      top: (height - size) / 2,
      width: size,
      height: size,
    }
  }

  function writeReadout(text: string) {
    if (text === readout) return
    readout = text
    const element = document.querySelector(READOUT)
    if (element) element.textContent = text
  }

  function draw(now: number, dt: number) {
    if (!link() || !count) return false
    if (start < 0) start = now
    const elapsed = now - start
    const t = elapsed / 1000
    const step = dt / 1000
    const state = intro(elapsed, paths.length)
    const viewport: Viewport = { width, height }
    const logo = heroLogo()

    // The blocks: from the spread into the logo, turned less as they land,
    // then breathing in place.
    const k = state.gather
    for (let i = 0; i < BLOCKS; i++) {
      const slot = gatherSlot(viewport, logo, i, k)
      let rx = lerp(-0.1 - t * 0.012, -0.26, k)
      const ry = lerp(0.16 + t * 0.02, 0.36, k)
      let z = lerp(-1.5 + (i % 3) * 0.8, 0, k)
      z += Math.sin(t * 0.9 + phases[i]) * 0.12 * k * slot.scale
      rx += Math.sin(t * 0.6 + phases[i]) * 0.03 * k
      compose(blocks, i * 16, [slot.x, slot.y, z], [rx, ry, 0], slot.scale)
      form[i] = state.form
    }

    // The camera, a little after the pointer.
    const px = pointer ? pointer.x / width - 0.5 : 0
    const py = pointer ? pointer.y / height - 0.5 : 0
    camera = {
      x: damp(camera.x, px * PARALLAX_X, PARALLAX_RATE, step),
      y: damp(camera.y, -py * PARALLAX_Y, PARALLAX_RATE, step),
    }
    perspective(projection, FOV, width / height, 0.1, 200)
    lookAt(
      view,
      [camera.x, camera.y, CAM_D],
      [camera.x * 0.6, camera.y * 0.6, 0]
    )
    multiply(viewProj, projection, view)

    const w = canvas.width
    const h = canvas.height
    const tone = target && hdr ? 0 : 1
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
      gl.clearColor(0, 0, 0, 0)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.clearColor(...colors.surface, 1)
    }
    gl.viewport(0, 0, w, h)
    gl.enable(gl.DEPTH_TEST)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.useProgram(dustProgram)
    gl.uniformMatrix4fv(dustAt.uViewProj, false, viewProj)
    gl.uniformMatrix4fv(dustAt.uBlock, false, blocks)
    gl.uniform1fv(dustAt.uForm, form)
    gl.uniform1f(dustAt.uTime, t)
    gl.uniform1f(dustAt.uScale, (h * 0.5) / Math.tan(FOV / 2))
    gl.uniform1f(dustAt.uSizeK, (9000 / quality.perBlock) ** 0.3)
    gl.uniform1f(dustAt.uMinSize, dpr)
    gl.uniform3fv(dustAt.uKey, KEY)
    gl.uniform3fv(dustAt.uSteel, colors.steel)
    gl.uniform3fv(dustAt.uRim, colors.rim)
    gl.uniform3fv(dustAt.uFlash, colors.flash)
    gl.uniform1f(dustAt.uTone, tone)
    gl.bindVertexArray(dustVao)
    gl.drawArrays(gl.POINTS, 0, count)

    if (target && finishProgram && finishAt) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.disable(gl.DEPTH_TEST)
      gl.useProgram(finishProgram)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, target.texture)
      gl.uniform3fv(finishAt.uSurface, colors.surface)
      gl.uniform2f(finishAt.uSize, w, h)
      gl.uniform1f(finishAt.uTone, 1 - tone)
      gl.uniform1f(finishAt.uVignette, colors.dark ? VIGNETTE : 0)
      gl.uniform1f(finishAt.uGrain, GRAIN)
      gl.uniform1f(finishAt.uTime, t)
      gl.bindVertexArray(emptyVao)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    gl.bindVertexArray(null)

    writeReadout(
      state.done ? "Indexed" : `Crawling · ${paths[state.path] ?? ""}`
    )
    return true
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick)
    // A frame cap below the display's: skip frames that come too soon.
    if (quality.fps < 60 && now - drawnAt < 1000 / quality.fps - 3) return
    const drawn = draw(now, last < 0 ? 0 : now - last)
    last = now
    if (!drawn) return
    drawnAt = now
    onFrame(now)
    if (!ready) {
      ready = true
      onReady()
    }
  }

  const move = (event: PointerEvent) => {
    // Touch scrolls the page: no parallax under a finger.
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
    colors = palette(read)
    redraw()
  })

  resize()
  void lay()
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
      gl.deleteBuffer(dustBuffer)
      gl.deleteVertexArray(dustVao)
      gl.deleteVertexArray(emptyVao)
      if (target) {
        gl.deleteTexture(target.texture)
        gl.deleteRenderbuffer(target.depth)
        gl.deleteFramebuffer(target.framebuffer)
      }
      for (const shader of shaders) gl.deleteShader(shader)
      for (const program of programs) gl.deleteProgram(program)
      // One WebGL context on the page (ADR-0012): a canvas that left it
      // gives its context back now rather than at garbage collection. Not
      // under StrictMode's rerun, which keeps the canvas and its context.
      if (!canvas.isConnected && !gl.isContextLost()) lose?.loseContext()
    },
  }
}
