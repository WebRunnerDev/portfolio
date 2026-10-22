import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "cn"

import { IMAGE_WIDTHS, imageUrl } from "@contracts/media"

import { CodeBlock } from "./code-block"

type Node = NonNullable<ExtraProps["node"]>

const BLOCK = "mt-zsd-md first:mt-0"

const HEADING =
  "mt-zsd-xl font-heading break-words text-zsd-on-surface first:mt-0"

const LINK =
  "text-zsd-primary-text underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-ring"

// The column is `x-zsd.layout.prose-max` (720px) wide at most.
const IMAGE_SIZES = "(min-width: 768px) 720px, 100vw"

const MEDIA = "/media/"

function isExternal(href: string | undefined) {
  return !!href && /^https?:\/\//i.test(href)
}

// The R2 key of an upload's URL, or null for any other image.
function mediaKey(src: unknown) {
  if (typeof src !== "string" || !src.startsWith(MEDIA)) return null
  try {
    return decodeURIComponent(src.slice(MEDIA.length))
  } catch {
    return null
  }
}

function textOf(node: Node | Node["children"][number]): string {
  if (node.type === "text") return node.value
  if (node.type === "element") return node.children.map(textOf).join("")
  return ""
}

// react-markdown hands each component its hast `node`: no DOM attribute.
function dom<P extends ExtraProps>(props: P): Omit<P, "node"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { node, ...rest } = props
  return rest
}

// The page title is the only h1: the Markdown's headings go one level down.
function heading(level: 2 | 3 | 4 | 5 | 6, size: string): Components["h1"] {
  const Tag = `h${level}` as const
  return function Heading(props) {
    return <Tag {...dom(props)} className={cn(HEADING, size)} />
  }
}

const COMPONENTS: Components = {
  h1: heading(2, "text-zsd-headline-md"),
  h2: heading(3, "text-zsd-headline-sm"),
  h3: heading(4, "text-zsd-body-lg font-semibold"),
  h4: heading(5, "text-zsd-body-md font-semibold"),
  h5: heading(6, "text-zsd-body-md font-semibold"),
  h6: heading(6, "text-zsd-body-md font-semibold"),
  p: (props) => <p className={BLOCK} {...dom(props)} />,
  ul: (props) => (
    <ul className={cn(BLOCK, "list-disc ps-zsd-xl")} {...dom(props)} />
  ),
  ol: (props) => (
    <ol className={cn(BLOCK, "list-decimal ps-zsd-xl")} {...dom(props)} />
  ),
  li: (props) => (
    <li
      className="mt-zsd-xs [&>ol]:mt-zsd-xs [&>ul]:mt-zsd-xs"
      {...dom(props)}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className={cn(
        BLOCK,
        "border-s-2 border-zsd-outline ps-zsd-lg text-zsd-on-surface-muted"
      )}
      {...dom(props)}
    />
  ),
  hr: () => <hr className="my-zsd-xl border-zsd-outline-muted" />,
  // Other sites open in a new tab, without access to this one.
  a: (props) =>
    isExternal(props.href) ? (
      <a
        {...dom(props)}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK}
      />
    ) : (
      <a {...dom(props)} className={LINK} />
    ),
  // Uploads (`/media/<key>`) go through Cloudflare Images. The CSP allows no
  // other origin, so an image from elsewhere is only its alt text.
  img: ({ src, alt = "" }) => {
    const key = mediaKey(src)
    if (!key) return alt ? <span>{alt}</span> : null
    return (
      <img
        src={imageUrl(key, 960)}
        srcSet={IMAGE_WIDTHS.map((w) => `${imageUrl(key, w)} ${w}w`).join(", ")}
        sizes={IMAGE_SIZES}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="block h-auto max-w-full"
      />
    )
  },
  pre: ({ node }) => {
    const code = node?.children.find(
      (child) => child.type === "element" && child.tagName === "code"
    )
    if (code?.type !== "element") return null
    const language = (code.properties.className as string[] | undefined)
      ?.find((name) => name.startsWith("language-"))
      ?.slice("language-".length)
    return (
      <CodeBlock code={textOf(code).replace(/\n$/, "")} language={language} />
    )
  },
  // Inline code; blocks render through `pre`.
  code: (props) => (
    <code
      dir="ltr"
      className="bg-zsd-surface-raised px-1 font-zsd-code-md text-[0.875em] break-words"
      {...dom(props)}
    />
  ),
  // A wide table scrolls in its own region, like code.
  table: (props) => (
    <div tabIndex={0} className={cn(BLOCK, "overflow-x-auto")}>
      <table
        className="w-full border-collapse text-zsd-body-sm"
        {...dom(props)}
      />
    </div>
  ),
  th: (props) => (
    <th
      className="border border-zsd-outline-muted bg-zsd-surface-raised px-zsd-sm py-zsd-xs text-start font-semibold"
      {...dom(props)}
    />
  ),
  td: (props) => (
    <td
      className="border border-zsd-outline-muted px-zsd-sm py-zsd-xs"
      {...dom(props)}
    />
  ),
}

// Markdown from D1 (Case Studies, Posts) as React elements, with GFM
// tables, task lists and autolinks. Raw HTML is dropped and URLs other than
// http(s), mailto and relative ones are emptied, so the Markdown can't inject
// markup or scripts.
export function Markdown({
  children,
  lang,
  dir,
  className,
}: {
  children: string
  lang?: string
  dir?: "ltr" | "rtl"
  className?: string
}) {
  return (
    <div
      lang={lang}
      dir={dir}
      className={cn(
        "text-zsd-body-md break-words text-zsd-on-surface",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
