import * as React from "react"

export type Theme = "dark" | "light" | "system"

export type ThemeState = {
  theme: Theme
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
