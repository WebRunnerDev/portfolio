import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"

import "./index.css"
import { routeTree } from "./app/routeTree.gen"

// ADR-0005: page changes run in a View Transition; without the API they are
// instant. index.css sets the animation.
// Loader data stays fresh as long as the Public API's `max-age`: going back to
// a page within a minute doesn't ask again. A new Lang is a new cache entry.
const router = createRouter({
  routeTree,
  defaultViewTransition: true,
  defaultStaleTime: 60_000,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
  // `theme` forces one on a route and its children (the root route reads it).
  interface StaticDataRouteOption {
    theme?: "light"
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
