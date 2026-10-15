import type { ComponentProps } from "react"

// Same seven rhombus tiles as public/logo.svg. Each tile is its own <path>
// so it can be animated one by one. Never mirrored in RTL (ADR-0007).
export const LOGO_TILES = [
  "M5.5 5L7 6.5L5.5 8L4 6.5L5.5 5Z",
  "M4.5 2L6 3.5L4.5 5L3 3.5L4.5 2Z",
  "M2.5 0L4 1.5L2.5 3L1 1.5L2.5 0Z",
  "M1.5 3L3 4.5L1.5 6L0 4.5L1.5 3Z",
  "M7.5 1L9 2.5L7.5 4L6 2.5L7.5 1Z",
  "M3.5 7L5 8.5L3.5 10L2 8.5L3.5 7Z",
  "M8.5 6L10 7.5L8.5 9L7 7.5L8.5 6Z",
] as const

export function Logo({
  title = "WebRunner",
  ...props
}: ComponentProps<"svg"> & { title?: string }) {
  return (
    <svg viewBox="0 0 10 10" fill="currentColor" role="img" {...props}>
      <title>{title}</title>
      {LOGO_TILES.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
