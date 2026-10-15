// Source of truth for UI keys: every other Lang must define exactly these.
export const en = {
  "home.tagline": "Portfolio is on its way.",
  "header.menu": "Menu",
  "header.design": "Design system",
  "langSwitcher.label": "Language",
  "themeSwitcher.label": "Theme",
  "themeSwitcher.light": "Light",
  "themeSwitcher.dark": "Dark",
  "themeSwitcher.system": "System",
}

export type MessageKey = keyof typeof en

export type Messages = Record<MessageKey, string>
