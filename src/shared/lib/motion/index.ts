export { DURATION, EASE, STAGGER } from "./tokens"

// For LazyMotion's `features` in app/providers.
export const loadMotionFeatures = () =>
  import("./features").then((module) => module.default)
