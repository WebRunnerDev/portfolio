import * as React from "react"

import {
  readTheme,
  ThemeContext,
  THEME_STORAGE_KEY,
  writeTheme,
  type Theme,
} from "@/shared/lib/theme"

type ResolvedTheme = "dark" | "light"

type ThemeProviderProps = {
  children: React.ReactNode
  // Wins over the chosen theme without changing it, e.g. the Print CV.
  forcedTheme?: ResolvedTheme
  defaultTheme?: Theme
  storageKey?: string
  disableTransitionOnChange?: boolean
}

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function getSystemTheme(): ResolvedTheme {
  if (window.matchMedia(COLOR_SCHEME_QUERY).matches) {
    return "dark"
  }

  return "light"
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style")
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"
    )
  )
  document.head.appendChild(style)

  return () => {
    window.getComputedStyle(document.body)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove()
      })
    })
  }
}

// Crossfade between themes with a View Transition (ADR-0005); swap instantly
// under reduced motion or where the API is missing.
function canAnimateThemeChange() {
  return (
    typeof document.startViewTransition === "function" &&
    document.visibilityState === "visible" &&
    !window.matchMedia(REDUCED_MOTION_QUERY).matches
  )
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const editableParent = target.closest(
    "input, textarea, select, [contenteditable='true']"
  )
  if (editableParent) {
    return true
  }

  return false
}

export function ThemeProvider({
  children,
  forcedTheme,
  defaultTheme = "system",
  storageKey = THEME_STORAGE_KEY,
  disableTransitionOnChange = true,
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(
    () => readTheme(storageKey) ?? defaultTheme
  )

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      writeTheme(nextTheme, storageKey)
      setThemeState(nextTheme)
    },
    [storageKey]
  )

  const applyTheme = React.useCallback(
    (nextTheme: Theme) => {
      const root = document.documentElement
      const resolvedTheme =
        nextTheme === "system" ? getSystemTheme() : nextTheme

      // The inline script in index.html already set it before the first paint.
      if (root.classList.contains(resolvedTheme)) {
        return
      }

      const swap = () => {
        const restoreTransitions = disableTransitionOnChange
          ? disableTransitionsTemporarily()
          : null

        root.classList.remove("light", "dark")
        root.classList.add(resolvedTheme)

        if (restoreTransitions) {
          restoreTransitions()
        }
      }

      if (canAnimateThemeChange()) {
        document.startViewTransition(swap)
        return
      }

      swap()
    },
    [disableTransitionOnChange]
  )

  React.useEffect(() => {
    if (forcedTheme) {
      applyTheme(forcedTheme)
      return undefined
    }

    applyTheme(theme)

    if (theme !== "system") {
      return undefined
    }

    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY)
    const handleChange = () => {
      applyTheme("system")
    }

    mediaQuery.addEventListener("change", handleChange)

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [theme, forcedTheme, applyTheme])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      setThemeState((currentTheme) => {
        const nextTheme =
          currentTheme === "dark"
            ? "light"
            : currentTheme === "light"
              ? "dark"
              : getSystemTheme() === "dark"
                ? "light"
                : "dark"

        writeTheme(nextTheme, storageKey)
        return nextTheme
      })
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [storageKey])

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return
      }

      if (event.storageArea !== localStorage) {
        return
      }

      setThemeState(readTheme(storageKey) ?? defaultTheme)
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [defaultTheme, storageKey])

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme]
  )

  return (
    <ThemeContext.Provider {...props} value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
