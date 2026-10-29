import type { LanguageRegistration } from "@shikijs/core"

type LanguageModule = () => Promise<{ default: LanguageRegistration[] }>

// The languages code blocks are highlighted in, by the name after the fence
// (lower-cased). Each import is a chunk of its own; any other name stays
// plain text.
const LANGUAGES: Record<string, LanguageModule> = {
  ts: () => import("@shikijs/langs/typescript"),
  tsx: () => import("@shikijs/langs/tsx"),
  js: () => import("@shikijs/langs/javascript"),
  jsx: () => import("@shikijs/langs/jsx"),
  json: () => import("@shikijs/langs/json"),
  css: () => import("@shikijs/langs/css"),
  html: () => import("@shikijs/langs/html"),
  bash: () => import("@shikijs/langs/shellscript"),
  sql: () => import("@shikijs/langs/sql"),
  yaml: () => import("@shikijs/langs/yaml"),
  diff: () => import("@shikijs/langs/diff"),
  md: () => import("@shikijs/langs/markdown"),
}

const ALIASES: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  mjs: "js",
  cjs: "js",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  markdown: "md",
}

export const LANGUAGE_NAMES = Object.keys(LANGUAGES)

export function languageModule(language: string): LanguageModule | undefined {
  let name = language.toLowerCase()
  if (Object.hasOwn(ALIASES, name)) name = ALIASES[name]
  return Object.hasOwn(LANGUAGES, name) ? LANGUAGES[name] : undefined
}
