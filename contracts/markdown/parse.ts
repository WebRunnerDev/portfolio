import type { Element, ElementContent, Root as HastRoot } from "hast"
import type { Heading, Parent, Root } from "mdast"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

import { highlight } from "./highlight"
import {
  MARKDOWN_ATTRIBUTES,
  MARKDOWN_TAGS,
  type MarkdownAttribute,
  type MarkdownElement,
  type MarkdownNode,
  type MarkdownTag,
  type MarkdownTree,
} from "./tree"

function headingsOf(parent: Parent): Heading[] {
  return parent.children.flatMap((child) => [
    ...(child.type === "heading" ? [child] : []),
    ...("children" in child ? headingsOf(child) : []),
  ])
}

// Lifts the headings so the top one is `#`, whether the Markdown starts at
// `#` or `##`; `toTree` then moves them all one level down, so levels follow
// the page title (the only h1) unskipped.
function remarkTopHeading() {
  return (tree: Root) => {
    const headings = headingsOf(tree)
    const shift = Math.min(...headings.map((h) => h.depth)) - 1
    for (const h of headings) h.depth = (h.depth - shift) as Heading["depth"]
  }
}

// GFM: tables, task lists, strikethrough, autolinks, footnotes. Without
// `allowDangerousHtml`, raw HTML never reaches the hast.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkTopHeading)
  .use(remarkRehype)

const SAFE_PROTOCOL = /^(https?|ircs?|mailto|xmpp)$/i

// A URL with a protocol other than http(s), mailto and the like is emptied
// (`javascript:`, `data:`); relative ones stay. As react-markdown did.
export function safeUrl(value: string) {
  const colon = value.indexOf(":")
  const questionMark = value.indexOf("?")
  const numberSign = value.indexOf("#")
  const slash = value.indexOf("/")
  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    SAFE_PROTOCOL.test(value.slice(0, colon))
  ) {
    return value
  }
  return ""
}

const TAGS = new Set<string>(MARKDOWN_TAGS)
const ATTRIBUTES = new Set<string>(MARKDOWN_ATTRIBUTES)
const URL_ATTRIBUTES = new Set(["href", "src"])
// Elements whose whitespace between children is only source formatting
// (and text a <table> can't hold).
const BLOCKS = new Set([
  "blockquote",
  "ol",
  "ul",
  "section",
  "table",
  "thead",
  "tbody",
  "tr",
])

// `#` → h2 … `#####` and `######` → h6.
function tagOf(tagName: string): string {
  const heading = /^h([1-6])$/.exec(tagName)
  if (!heading) return tagName
  return `h${Math.min(Number(heading[1]) + 1, 6)}`
}

function textOf(node: ElementContent): string {
  if (node.type === "text") return node.value
  if (node.type === "element") return node.children.map(textOf).join("")
  return ""
}

async function codeBlock(pre: Element): Promise<MarkdownNode | null> {
  const code = pre.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "code"
  )
  if (!code) return null
  const language = (code.properties.className as string[] | undefined)
    ?.find((name) => name.startsWith("language-"))
    ?.slice("language-".length)
  const text = textOf(code).replace(/\n$/, "")
  // Shiki failing leaves the block plain.
  const lines = language
    ? await highlight(text, language).catch(() => null)
    : null
  return {
    tag: "pre",
    code: text,
    ...(language && { language }),
    ...(lines && { lines }),
  }
}

async function toNodes(
  children: ElementContent[],
  parent: string | null
): Promise<MarkdownNode[]> {
  const nodes = await Promise.all(
    children.map(async (child): Promise<MarkdownNode[]> => {
      if (child.type === "text") {
        const blank = !child.value.trim()
        return blank && (parent === null || BLOCKS.has(parent))
          ? []
          : [child.value]
      }
      if (child.type !== "element") return []
      if (child.tagName === "pre") {
        const block = await codeBlock(child)
        return block ? [block] : []
      }
      const tag = tagOf(child.tagName)
      const content = await toNodes(child.children, tag)
      // Anything else (a wrapper of GFM's, say) gives up only its content.
      if (!TAGS.has(tag)) return content
      const element: MarkdownElement = { tag: tag as MarkdownTag }
      const attrs: MarkdownElement["attrs"] = {}
      for (const [name, value] of Object.entries(child.properties)) {
        if (!ATTRIBUTES.has(name) || value === null || value === undefined) {
          continue
        }
        const key = name as MarkdownAttribute
        if (typeof value === "boolean") attrs[key] = value
        else {
          const text = String(value)
          attrs[key] = URL_ATTRIBUTES.has(key) ? safeUrl(text) : text
        }
      }
      if (Object.keys(attrs).length) element.attrs = attrs
      if (content.length) element.children = content
      return [element]
    })
  )
  return nodes.flat()
}

// Bodies seen lately, rendered: a page is asked for again and again, and
// highlighting is the costly part.
const CACHE_SIZE = 64
const cache = new Map<string, Promise<MarkdownTree>>()

// Markdown (a Case Study, a Post) as a tree for `Markdown` to render.
export function markdownTree(source: string): Promise<MarkdownTree> {
  const cached = cache.get(source)
  if (cached) return cached
  const tree = processor
    .run(processor.parse(source))
    .then((root) =>
      toNodes((root as HastRoot).children as ElementContent[], null)
    )
  cache.set(source, tree)
  tree.catch(() => cache.delete(source))
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!)
  return tree
}
