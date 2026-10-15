import type { MessageKey } from "@/shared/i18n"

// Site sections in menu order. The header names the current one.
export const SECTIONS = [
  { to: "/$lang", label: "nav.home" },
  { to: "/$lang/cv", label: "nav.cv" },
  { to: "/$lang/projects", label: "nav.projects" },
  { to: "/$lang/gallery", label: "nav.gallery" },
  { to: "/$lang/blog", label: "nav.blog" },
  { to: "/$lang/contacts", label: "nav.contacts" },
] as const satisfies readonly { to: string; label: MessageKey }[]

export type Section = (typeof SECTIONS)[number]

// Home matches only itself; other sections also match their subpages.
export const isHome = (section: Section) => section.to === "/$lang"
