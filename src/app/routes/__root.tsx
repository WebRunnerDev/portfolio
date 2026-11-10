import { Outlet, createRootRoute, useMatches } from "@tanstack/react-router"

import { MotionTierProvider, ThemeProvider } from "@/app/providers"

// The theme a matched route forces through `staticData.theme`, if any.
function useForcedTheme() {
  return useMatches({
    select: (matches) =>
      matches.findLast(({ staticData }) => staticData.theme)?.staticData.theme,
  })
}

// The Motion Tier is one for the visit (ADR-0012), so its provider sits at
// the root: in the entry chunk, not in a chunk of its own shared by the
// layout and the pages, and the input gate listens from the start.
export const Route = createRootRoute({
  component: function Root() {
    return (
      <ThemeProvider forcedTheme={useForcedTheme()}>
        <MotionTierProvider>
          <Outlet />
        </MotionTierProvider>
      </ThemeProvider>
    )
  },
})
