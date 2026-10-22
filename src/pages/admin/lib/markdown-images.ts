// Text edits of the Markdown editor's image uploads: a placeholder goes in at
// the caret and is later swapped for the image, or removed. The selection
// moves along with the text, so typing in the meantime isn't disturbed.

export type Selection = { start: number; end: number }

export type TextEdit = { text: string; selection: Selection }

// A placeholder of one upload; `id` keeps it apart from the others in flight.
// Not a /media/ image, so the preview shows its alt text.
export function placeholder(id: number) {
  return `![Uploading…](#upload-${id})`
}

// The image of an upload, with an empty alt text to fill in.
export function imageMarkdown(url: string) {
  return `![](${url})`
}

// Where the caret goes in `imageMarkdown`: inside the `[]`.
export const ALT_OFFSET = 2

// `insert` in place of the selection, the caret right after it.
export function insertAt(
  text: string,
  selection: Selection,
  insert: string
): TextEdit {
  const caret = selection.start + insert.length
  return {
    text: text.slice(0, selection.start) + insert + text.slice(selection.end),
    selection: { start: caret, end: caret },
  }
}

// `from` replaced with `to`; null when `from` is no longer in the text. A
// caret right after `from` goes to `caret` within `to` (to type the alt
// text), or after it.
export function replaceIn(
  text: string,
  selection: Selection,
  from: string,
  to: string,
  caret = to.length
): TextEdit | null {
  const index = text.indexOf(from)
  if (index < 0) return null
  const end = index + from.length
  const move = (position: number) =>
    position <= index
      ? position
      : position >= end
        ? position + to.length - from.length
        : index
  const collapsedAtEnd = selection.start === end && selection.end === end
  return {
    text: text.slice(0, index) + to + text.slice(end),
    selection: collapsedAtEnd
      ? { start: index + caret, end: index + caret }
      : { start: move(selection.start), end: move(selection.end) },
  }
}
