// What a translation of Markdown must not touch: code blocks, inline code,
// link and image targets, URLs. `protect` puts a numbered placeholder in each
// one's place before the text goes out, `restore` puts them back after. The
// model sees only the placeholders, so it can't translate a comment in a code
// block or "fix" a URL.

// Unlikely in a post, and kept as is by the model when told to.
const placeholder = (index: number) => `⟦${index}⟧`

const PLACEHOLDER = /⟦(\d+)⟧/g

// In this order: a fence may hold backticks and URLs, inline code may hold a
// URL. Each `(…)` group is what gets replaced; the rest stays to translate
// (a link's text, the brackets).
const PATTERNS: RegExp[] = [
  // Fenced code block, ``` or ~~~, up to the same fence or the end.
  /^( {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n {0,3}\2[^\n]*|$))/gm,
  // Inline code, any number of backticks.
  /((`+)[^`]+?\2)/g,
  // Link or image target, with its title: `](url "title")`.
  /\]\((\s*[^)\s]+(?:\s+"[^"]*")?\s*)\)/g,
  // Reference definition: `[id]: url`.
  /^( {0,3}\[[^\]]+\]:\s*\S+.*)$/gm,
  // Autolink and bare URL.
  /(<[a-z][a-z0-9+.-]*:[^\s>]+>|https?:\/\/[^\s<>()⟦⟧]+)/gi,
]

export function protect(markdown: string) {
  const slots: string[] = []
  let text = markdown
  for (const pattern of PATTERNS) {
    text = text.replace(pattern, (match, kept: string) => {
      slots.push(kept)
      return match.replace(kept, placeholder(slots.length - 1))
    })
  }
  return { text, slots }
}

// The translated text with its slots back; undefined when a placeholder is
// missing, repeated or unknown: the draft would lose or garble code or links.
export function restore(translated: string, slots: string[]) {
  const seen = new Set<number>()
  let broken = false
  const text = translated.replace(PLACEHOLDER, (match, digits: string) => {
    const index = Number(digits)
    if (index >= slots.length || seen.has(index)) broken = true
    seen.add(index)
    return slots[index] ?? match
  })
  return broken || seen.size !== slots.length ? undefined : text
}
