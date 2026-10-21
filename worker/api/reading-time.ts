// Minutes to read a post's Markdown `body`: its words at 200 a minute,
// rounded up, 1 at least. Code (fenced, indented or inline), URLs and markup
// aren't words; the text of links, images' alt and emphasis is.
const WORDS_PER_MINUTE = 200

const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu

function plainText(markdown: string) {
  return (
    markdown
      // Fenced blocks: ``` or ~~~, closed by the same fence or the end.
      .replace(
        /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[ \t]*$|(?![\s\S]))/gm,
        ""
      )
      // Indented blocks after a blank line.
      .replace(/(^|\n\s*\n)(?:(?: {4}|\t)[^\n]*(?:\n|$))+/g, "$1")
      .replace(/`+[^`\n]*`+/g, "")
      .replace(/<[^>]*>/g, "")
      // ![alt](url) and [text](url) keep their text; reference definitions go.
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/^ {0,3}\[[^\]]+\]:.*$/gm, "")
      .replace(/https?:\/\/\S+/g, "")
      // Ordered list markers: "1." is no word.
      .replace(/^\s*\d+[.)][ \t]/gm, "")
  )
}

export function readingMinutes(markdown: string) {
  const words = plainText(markdown).match(WORD)?.length ?? 0
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
