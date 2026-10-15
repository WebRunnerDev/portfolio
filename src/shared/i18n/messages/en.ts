// Source of truth for UI keys: every other Lang must define exactly these.
export const en = {
  "home.tagline": "Portfolio is on its way.",
  "langSwitcher.label": "Language",
}

export type MessageKey = keyof typeof en

export type Messages = Record<MessageKey, string>
