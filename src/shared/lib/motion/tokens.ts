// DESIGN.md › x-zsd.motion for Motion, which takes seconds and bezier arrays.
// The same values reach CSS through src/styles/tokens.css; tokens.test.ts
// checks both against DESIGN.md, so change DESIGN.md first.
type Bezier = [number, number, number, number]

export const EASE = {
  enter: [0.16, 1, 0.3, 1],
  hover: [0.25, 1, 0.5, 1],
  layout: [0.87, 0, 0.13, 1],
  exit: [0.7, 0, 0.84, 0],
} as const satisfies Record<string, Bezier>

export const DURATION = {
  fast: 0.12,
  base: 0.2,
  slow: 0.4,
  reveal: 0.8,
  choreographyMax: 1.2,
} as const

export const STAGGER = {
  word: 0.06,
  item: 0.08,
} as const
