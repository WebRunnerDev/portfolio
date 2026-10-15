// Supported Langs (CONTEXT.md). Shared by the frontend and the Worker.
export const LANGS = ["en", "ru", "kk", "es", "de", "ar"] as const

export type Lang = (typeof LANGS)[number]
