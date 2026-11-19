export { loadHome } from "./api/load-home"
export { HomePage } from "./ui/home-page"
// PROTOTYPE (spike/page-head): the Swarm for an inner page's head, lazily,
// so it stays in its own chunk.
export const loadHomeFull = () =>
  import("./ui/home-full").then((m) => ({ default: m.HomeFull }))
