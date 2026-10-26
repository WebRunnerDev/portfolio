// The animation features LazyMotion loads after the first paint (ADR-0005):
// `m` components render without them, so they stay out of the initial JS.
export { domAnimation as default } from "motion/react"
