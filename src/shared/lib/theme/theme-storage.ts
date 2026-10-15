import type { Theme } from "./theme-context"

// index.html reads the same key in its inline script, before the first paint.
export const THEME_STORAGE_KEY = "theme"

export const THEMES: readonly Theme[] = ["light", "dark", "system"]

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme)
}

// Storage throws in private modes and with blocked site data: the theme then
// lives for the session only.
export function readTheme(key = THEME_STORAGE_KEY): Theme | null {
  try {
    const value = localStorage.getItem(key)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

export function writeTheme(theme: Theme, key = THEME_STORAGE_KEY) {
  try {
    localStorage.setItem(key, theme)
  } catch {
    // Not persisted; the in-memory theme still applies.
  }
}
