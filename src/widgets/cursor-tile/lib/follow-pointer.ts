// docs/design-brief.md › Курсор-ромб, DESIGN.md › Tile: a small `outline`
// tile rides beside the native cursor, a little behind it (the transition in
// index.css › cursor tile), and turns `primary` over a link or a button. The
// handlers only note the pointer; one frame writes the transform and the
// attributes, and nothing reads layout.

// From the pointer's hotspot to the tile's corner, right and down: clear of
// the arrow, unmirrored like the cursor itself.
const OFFSET = 16
const TARGETS = 'a[href], button:not(:disabled), [role="button"]'

// Puts the tile on the page and moves it with a mouse or a pen; a touch, or
// the pointer leaving the window, hides it. Returns the stop.
export function followPointer() {
  const tile = document.createElement("span")
  tile.className = "cursor-tile"
  tile.setAttribute("aria-hidden", "true")
  document.body.append(tile)

  let x = 0
  let y = 0
  let over = false
  // In the window, by the last event; placed (then shown) by a frame since.
  let inside = false
  let shown = false
  let frame = 0

  const draw = () => {
    frame = 0
    if (!inside) {
      shown = false
      tile.removeAttribute("data-shown")
      return
    }
    tile.style.transform = `translate(${x}px, ${y}px)`
    tile.toggleAttribute("data-over", over)
    // A tile coming back is placed first and shown a frame later, so it
    // doesn't glide in from where it left.
    if (shown) tile.setAttribute("data-shown", "")
    else {
      shown = true
      request()
    }
  }
  const request = () => {
    frame ||= requestAnimationFrame(draw)
  }

  const move = (event: PointerEvent) => {
    inside = event.pointerType !== "touch"
    x = event.clientX + OFFSET
    y = event.clientY + OFFSET
    request()
  }
  const enter = ({ target }: PointerEvent) => {
    over = !!(target as Element).closest?.(TARGETS)
    request()
  }
  const leave = ({ relatedTarget }: PointerEvent) => {
    if (relatedTarget) return
    inside = false
    request()
  }

  const listeners = [
    ["pointermove", move],
    ["pointerdown", move],
    ["pointerover", enter],
    ["pointerout", leave],
  ] as const
  const options = { capture: true, passive: true }
  for (const [type, listener] of listeners) {
    window.addEventListener(type, listener, options)
  }
  return () => {
    for (const [type, listener] of listeners) {
      window.removeEventListener(type, listener, options)
    }
    cancelAnimationFrame(frame)
    tile.remove()
  }
}
