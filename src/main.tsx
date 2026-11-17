import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"

import "./index.css"
// PROTOTYPE (spike/path-to-10): the curtain of rhombi on a page change.
import "./shared/lib/prototype/curtain.css"
import { routeTree } from "./app/routeTree.gen"
import { markProto, proto } from "@/shared/lib/prototype"
import { pageTransitionTypes } from "@/shared/lib/view-transition"
import { LOADER_DELAY_MS } from "@/shared/ui/loader"
import { PageLoading } from "@/shared/ui/page-state"

// ADR-0005: page changes run in a View Transition; without the API they are
// instant. `pageTransitionTypes` names the direction and the shared cover,
// index.css sets the animation.
// Loader data stays fresh as long as the Public API's `max-age`: going back to
// a page within a minute doesn't ask again. A new Lang is a new cache entry.
// Back puts the scroll where it was: closing the Lightbox with Back leaves
// the Album where the reader left it.
// A route still loading its data or code shows its `pendingComponent` (else
// PageLoading) after LOADER_DELAY_MS: a faster answer never flashes a Loader.
const router = createRouter({
  routeTree,
  // PROTOTYPE (spike/path-to-10, `?transition=dust`): leaving the home page
  // while its Swarm runs, no View Transition: the live canvas carries it.
  defaultViewTransition: {
    types: (change) =>
      proto("transition") === "dust" &&
      /^\/[a-z]{2}\/?$/.test(change.fromLocation?.pathname ?? "") &&
      change.pathChanged &&
      document.querySelector("[data-swarm-scene][data-ready=true]")
        ? false
        : pageTransitionTypes(change),
  },
  defaultStaleTime: 60_000,
  scrollRestoration: true,
  defaultPendingMs: LOADER_DELAY_MS,
  defaultPendingComponent: PageLoading,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
  // `theme` forces one on a route and its children (the root route reads it).
  interface StaticDataRouteOption {
    theme?: "light"
  }
  // The Album page opened the Lightbox in this entry: closing it goes Back.
  interface HistoryState {
    lightbox?: true
  }
}

// PROTOTYPE (spike/path-to-10): the switches on <html> before the first paint.
markProto()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
