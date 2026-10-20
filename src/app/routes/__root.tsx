import { Outlet, createRootRoute, useMatches } from "@tanstack/react-router"

import { ThemeProvider } from "@/app/providers"

// The theme a matched route forces through `staticData.theme`, if any.
function useForcedTheme() {
  return useMatches({
    select: (matches) =>
      matches.findLast(({ staticData }) => staticData.theme)?.staticData.theme,
  })
}

export const Route = createRootRoute({
  component: function Root() {
    return (
      <ThemeProvider forcedTheme={useForcedTheme()}>
        <Outlet />
      </ThemeProvider>
    )
  },
})
