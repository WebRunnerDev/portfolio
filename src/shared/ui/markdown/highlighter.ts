// Shiki, loaded by `CodeBlock` only when a page has code. The core, the JS
// RegExp engine (no WASM) and the two themes come in this chunk; each language
// is a chunk of its own, loaded the first time a block asks for it.
import { createHighlighterCore, type HighlighterCore } from "@shikijs/core"
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript"
import githubDarkDefault from "@shikijs/themes/github-dark-default"
import githubLightHighContrast from "@shikijs/themes/github-light-high-contrast"

import { languageModule } from "./languages"

const THEMES = {
  light: githubLightHighContrast,
  dark: githubDarkDefault,
}

// Token colours below AA (4.5:1) against the block's background
// (`surface-raised`: #E5E7EB light, #1E1E1E dark) swapped for a darker one of
// the same hue: the light theme's comments. `highlighter.test.ts` checks every
// colour a sample of each language gets, in both themes.
const COLOR_REPLACEMENTS = {
  [THEMES.light.name!]: { "#66707b": "#59636e" },
}

export type Token = { content: string; light?: string; dark?: string }

let highlighter: Promise<HighlighterCore> | undefined

function load() {
  highlighter ??= createHighlighterCore({
    themes: [THEMES.light, THEMES.dark],
    langs: [],
    engine: createJavaScriptRegexEngine(),
  })
  return highlighter
}

// The lines of `code` as coloured tokens, or null for a language Shiki here
// doesn't know (the block stays plain text).
export async function highlight(
  code: string,
  language: string
): Promise<Token[][] | null> {
  const module = languageModule(language)
  if (!module) return null
  const [core, grammar] = await Promise.all([load(), module()])
  await core.loadLanguage(grammar.default)
  const name = grammar.default.at(-1)!.name
  const { tokens } = core.codeToTokens(code, {
    lang: name,
    themes: { light: THEMES.light.name!, dark: THEMES.dark.name! },
    defaultColor: false,
    colorReplacements: COLOR_REPLACEMENTS,
  })
  return tokens.map((line) =>
    line.map((token) => ({
      content: token.content,
      light: token.htmlStyle?.["--shiki-light"],
      dark: token.htmlStyle?.["--shiki-dark"],
    }))
  )
}
