// Lang preloads (#169): a preload in index.html that only some Langs need,
// such as the font of a Lang's own script, is marked with those Langs
// (`data-lang`, space apart). The Worker keeps it on their pages and drops
// it everywhere else, so the other Langs don't download it.

export const LANG_ATTRIBUTE = "data-lang"

// Whether a preload marked with `value` belongs on a page in `lang`.
export function langMatches(value: string, lang: string): boolean {
  return value.split(" ").includes(lang)
}
