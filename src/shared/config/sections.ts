import type { MessageKey } from "@/shared/i18n"

// Site sections in menu order. The header names the current one; the menu's
// blocks add the page's own description.
export const SECTIONS = [
  { to: "/$lang", label: "nav.home", description: "meta.home" },
  { to: "/$lang/cv", label: "nav.cv", description: "meta.cv" },
  {
    to: "/$lang/projects",
    label: "nav.projects",
    description: "meta.projects",
  },
  { to: "/$lang/gallery", label: "nav.gallery", description: "meta.gallery" },
  { to: "/$lang/blog", label: "nav.blog", description: "meta.blog" },
] as const satisfies readonly {
  to: string
  label: MessageKey
  description: MessageKey
}[]

export type Section = (typeof SECTIONS)[number]

// Home matches only itself; other sections also match their subpages.
export const isHome = (section: Section) => section.to === "/$lang"
