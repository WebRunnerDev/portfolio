import * as v from "valibot"

// A Markdown document rendered on the Worker (#142): the public pages get
// this tree instead of the text, so neither the Markdown parser nor Shiki
// loads in the browser. `markdownTree` (./parse.ts) builds it, `Markdown`
// (@/shared/ui/markdown) renders it. Only the tags and attributes below make
// it into a tree: raw HTML is dropped, unsafe URLs are emptied.

// One token of a highlighted line, with its colour in each theme.
export type Token = { content: string; light?: string; dark?: string }

// A fenced code block: its text, the language after the fence and, for a
// language Shiki knows, its lines as tokens.
export type MarkdownCode = {
  tag: "pre"
  code: string
  language?: string
  lines?: Token[][]
}

export const MARKDOWN_TAGS = [
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "br",
  "a",
  "img",
  "code",
  "em",
  "strong",
  "del",
  "sup",
  "section",
  "input",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
] as const

export type MarkdownTag = (typeof MARKDOWN_TAGS)[number]

export const MARKDOWN_ATTRIBUTES = [
  "href",
  "src",
  "alt",
  "title",
  "id",
  "start",
  "type",
  "checked",
  "disabled",
  "align",
] as const

export type MarkdownAttribute = (typeof MARKDOWN_ATTRIBUTES)[number]

export type MarkdownElement = {
  tag: MarkdownTag
  attrs?: Partial<Record<MarkdownAttribute, string | boolean>>
  children?: MarkdownNode[]
}

// Text is a plain string.
export type MarkdownNode = string | MarkdownElement | MarkdownCode

export type MarkdownTree = MarkdownNode[]

const TokenSchema = v.object({
  content: v.string(),
  light: v.optional(v.string()),
  dark: v.optional(v.string()),
})

const CodeSchema = v.object({
  tag: v.literal("pre"),
  code: v.string(),
  language: v.optional(v.string()),
  lines: v.optional(v.array(v.array(TokenSchema))),
})

const NodeSchema: v.GenericSchema<MarkdownNode> = v.union([
  v.string(),
  CodeSchema,
  v.object({
    tag: v.picklist(MARKDOWN_TAGS),
    attrs: v.optional(
      v.record(
        v.picklist(MARKDOWN_ATTRIBUTES),
        v.union([v.string(), v.boolean()])
      )
    ),
    children: v.optional(v.array(v.lazy(() => NodeSchema))),
  }),
])

export const MarkdownTreeSchema = v.array(NodeSchema)
