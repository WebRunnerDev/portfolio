import * as React from "react"

export type Theme = "dark" | "light" | "system"
export type ResolvedTheme = "dark" | "light"

export type ThemeState = {
  // "system" until the visitor picks one: a first visit follows the OS.
  theme: Theme
  // What is on screen now, "system" resolved.
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

// The provider lives in app/providers; pages read the theme through useTheme.
export const ThemeContext = React.createContext<ThemeState | undefined>(
  undefined
)

export const useTheme = () => {
  const context = React.useContext(ThemeContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
