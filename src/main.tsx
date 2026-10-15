import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"

import "./index.css"
import { routeTree } from "./app/routeTree.gen"
import { ThemeProvider } from "./app/providers"

// ADR-0005: page changes run in a View Transition; without the API they are
// instant. index.css sets the animation.
const router = createRouter({ routeTree, defaultViewTransition: true })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
)
