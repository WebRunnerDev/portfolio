/*!
 * The `full` Hero Tier's grid, after Kinetic Grid from OriginKit
 * (https://www.originkit.dev/, https://github.com/vellum-ai/originkit).
 * Reworked for the hero (docs/design-brief.md › Hero effect): a rhombus
 * lattice, lit cells, a wave without a pointer, every line in one path.
 *
 * MIT License
 *
 * Copyright (c) 2026 Vellum, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// The grid step: the diagonals of each rhombus cell. The same as the static
// image (scripts/generate-hero-static.mjs).
const STEP = 48
const HALF = STEP / 2
// Lattice points within this distance lean toward the pointer, by up to PULL
// of the way.
const PULL_RADIUS = 4 * STEP
const PULL = 0.25
// Cells this close to the pointer light up. DESIGN.md: rust stays a few
// tiles, never a large fill.
const LIGHT_RADIUS = 1.25 * STEP
const MAX_FILL = 0.9
// The wave without a pointer: crosses the grid from left to right once per
// period, lighting a few cells near its front.
const WAVE_PERIOD_MS = 10_000
const WAVE_SPREAD = 4 * STEP
const WAVE_DENSITY = 0.12
// How fast the pointer's place and presence follow it: the time to cover
// about two thirds of the way.
const FOLLOW_MS = 80
const PRESENCE_MS = 400
// Fill opacities snap to these many levels, one path each.
const LEVELS = 9

// DESIGN.md colors, read from the tokens so they follow the theme.
const COLORS = {
  line: "--zsd-colors-outline-muted",
  point: "--zsd-colors-outline",
  fill: "--zsd-colors-primary",
}

// A fixed pseudo-random number in [0, 1) for a cell.
const random = (i: number, j: number) => {
  const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return x - Math.floor(x)
}

// 1 at the center, falling to 0 at `radius` and beyond. The box check skips
// the square root for the many points far away.
const closeness = (dx: number, dy: number, radius: number) =>
  Math.abs(dx) >= radius || Math.abs(dy) >= radius
    ? 0
    : Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / radius)

export type KineticGrid = {
  play: () => void
  pause: () => void
  destroy: () => void
}

// Draws the grid on `canvas` at DPR 1 and animates it while playing. Each
// frame's timestamp goes to `onFrame`. Returns null without a 2D context.
export function kineticGrid(
  canvas: HTMLCanvasElement,
  onFrame: (now: number) => void
): KineticGrid | null {
  const context = canvas.getContext("2d", { alpha: true })
  if (!context) return null
  const ctx = context

  let width = 0
  let height = 0
  // Lattice columns and rows, from −1 so the grid bleeds past the edges.
  let columns = 0
  let rows = 0
  // Each lattice point's place this frame.
  let xs = new Float32Array(0)
  let ys = new Float32Array(0)
  // Each cell's two random numbers: whether the wave lights it, and how much.
  let picks = new Float32Array(0)
  let shades = new Float32Array(0)
  let colors = { line: "", point: "", fill: "" }

  // The pointer in client coordinates (none until a mouse or pen moves), and
  // its smoothed place and presence on the canvas.
  let pointer: { x: number; y: number } | null = null
  let smoothX = 0
  let smoothY = 0
  let presence = 0

  let frame = 0
  let last = -1

  const index = (i: number, j: number) => (j + 1) * (columns + 2) + (i + 1)

  function resize() {
    width = Math.max(1, Math.round(canvas.clientWidth))
    height = Math.max(1, Math.round(canvas.clientHeight))
    canvas.width = width
    canvas.height = height
    columns = Math.ceil(width / HALF) + 1
    rows = Math.ceil(height / HALF) + 1
    const size = (columns + 2) * (rows + 2)
    xs = new Float32Array(size)
    ys = new Float32Array(size)
    picks = new Float32Array(size)
    shades = new Float32Array(size)
    for (let j = -1; j <= rows; j++) {
      for (let i = -1; i <= columns; i++) {
        picks[index(i, j)] = random(i, j)
        shades[index(i, j)] = random(j, i)
      }
    }
  }

  function readColors() {
    const style = getComputedStyle(canvas)
    colors = {
      line: style.getPropertyValue(COLORS.line).trim(),
      point: style.getPropertyValue(COLORS.point).trim(),
      fill: style.getPropertyValue(COLORS.fill).trim(),
    }
  }

  function follow(dt: number) {
    const rect = canvas.getBoundingClientRect()
    const x = pointer ? pointer.x - rect.left : 0
    const y = pointer ? pointer.y - rect.top : 0
    const inside = pointer && x >= 0 && y >= 0 && x <= width && y <= height
    // A pointer that just came in starts where it is, not at the last place.
    if (inside && presence < 0.01) {
      smoothX = x
      smoothY = y
    } else if (inside) {
      const k = 1 - Math.exp(-dt / FOLLOW_MS)
      smoothX += (x - smoothX) * k
      smoothY += (y - smoothY) * k
    }
    presence +=
      ((inside ? 1 : 0) - presence) * (1 - Math.exp(-dt / PRESENCE_MS))
  }

  function place() {
    for (let j = -1; j <= rows; j++) {
      for (let i = -1; i <= columns; i++) {
        if ((i + j) % 2 !== 0) continue
        let x = i * HALF
        let y = j * HALF
        if (presence > 0.01) {
          const near = closeness(smoothX - x, smoothY - y, PULL_RADIUS)
          const pull = presence * near * near * PULL
          x += (smoothX - x) * pull
          y += (smoothY - y) * pull
        }
        xs[index(i, j)] = x
        ys[index(i, j)] = y
      }
    }
  }

  // The diagonal from lattice point (i, j) down to the edge, `step` columns
  // across per row.
  function diagonal(i: number, j: number, step: 1 | -1, straight: boolean) {
    let point = index(i, j)
    ctx.moveTo(xs[point], ys[point])
    while (j < rows && i + step >= -1 && i + step <= columns) {
      i += step
      j++
      const last = j === rows || i + step < -1 || i + step > columns
      if (straight && !last) continue
      point = index(i, j)
      ctx.lineTo(xs[point], ys[point])
    }
  }

  function draw(now: number) {
    place()
    ctx.clearRect(0, 0, width, height)

    // Cells: lit by the pointer and, without it, by the wave.
    const front =
      -WAVE_SPREAD +
      ((now % WAVE_PERIOD_MS) / WAVE_PERIOD_MS) * (width + 2 * WAVE_SPREAD)
    const levels = Array.from({ length: LEVELS }, () => new Path2D())
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < columns; i++) {
        // Cell centers sit where i + j is odd: between the lattice points.
        if ((i + j) % 2 === 0) continue
        const cx = i * HALF
        const cy = j * HALF
        let fill = 0
        if (presence > 0.01) {
          const near = closeness(smoothX - cx, smoothY - cy, LIGHT_RADIUS)
          fill = presence * MAX_FILL * near
        }
        const cell = index(i, j)
        if (presence < 0.99 && picks[cell] < WAVE_DENSITY) {
          const near = Math.exp(-(((cx - front) / WAVE_SPREAD) ** 2))
          const wave =
            (1 - presence) * MAX_FILL * near * (0.3 + 0.7 * shades[cell])
          fill = Math.max(fill, wave)
        }
        const level = Math.round((fill / MAX_FILL) * LEVELS)
        if (level < 1) continue
        const path = levels[level - 1]
        const top = index(i, j - 1)
        const right = index(i + 1, j)
        const bottom = index(i, j + 1)
        const left = index(i - 1, j)
        path.moveTo(xs[top], ys[top])
        path.lineTo(xs[right], ys[right])
        path.lineTo(xs[bottom], ys[bottom])
        path.lineTo(xs[left], ys[left])
        path.closePath()
      }
    }
    ctx.fillStyle = colors.fill
    levels.forEach((path, level) => {
      ctx.globalAlpha = ((level + 1) / LEVELS) * MAX_FILL
      ctx.fill(path)
    })
    ctx.globalAlpha = 1

    // Lines: each diagonal of the lattice as one polyline, all in one path;
    // straight while no pointer bends the grid. Points: 2 × 2 squares, in
    // another.
    const straight = presence <= 0.01
    ctx.beginPath()
    for (let j = -1; j <= rows; j++) {
      for (let i = -1; i <= columns; i++) {
        if ((i + j) % 2 !== 0) continue
        // A diagonal starts where the point above it is off the lattice.
        if (i === -1 || j === -1) diagonal(i, j, 1, straight)
        if (i === columns || j === -1) diagonal(i, j, -1, straight)
      }
    }
    ctx.strokeStyle = colors.line
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.beginPath()
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= columns; i++) {
        if ((i + j) % 2 !== 0) continue
        const point = index(i, j)
        ctx.rect(xs[point] - 1, ys[point] - 1, 2, 2)
      }
    }
    ctx.fillStyle = colors.point
    ctx.fill()
  }

  function tick(now: number) {
    follow(last < 0 ? 0 : now - last)
    last = now
    draw(now)
    onFrame(now)
    frame = requestAnimationFrame(tick)
  }

  const move = (event: PointerEvent) => {
    // Touch scrolls the page: touch screens get the wave.
    if (event.pointerType === "touch") return
    pointer = { x: event.clientX, y: event.clientY }
  }
  const leave = (event: PointerEvent) => {
    if (!event.relatedTarget) pointer = null
  }
  const resized = new ResizeObserver(() => {
    resize()
    // A resize clears the canvas: a paused grid draws its last frame again.
    if (!frame) draw(last < 0 ? 0 : last)
  })
  // The theme is a class on <html> (index.html, app/providers).
  const themed = new MutationObserver(readColors)

  readColors()
  resize()
  draw(0)
  resized.observe(canvas)
  themed.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  window.addEventListener("pointermove", move, { passive: true })
  window.addEventListener("pointerout", leave, { passive: true })

  const pause = () => {
    cancelAnimationFrame(frame)
    frame = 0
    last = -1
  }

  return {
    play: () => {
      if (!frame) frame = requestAnimationFrame(tick)
    },
    pause,
    destroy: () => {
      pause()
      resized.disconnect()
      themed.disconnect()
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerout", leave)
    },
  }
}
