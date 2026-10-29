import type { ReactNode } from "react"
import { cn } from "cn"

import type {
  MarkdownElement,
  MarkdownNode,
  MarkdownTree,
} from "@contracts/markdown/tree"
import { IMAGE_WIDTHS, imageUrl } from "@contracts/media"

import { CodeBlock } from "./code-block"

const BLOCK = "mt-zsd-md first:mt-0"

const HEADING =
  "mt-zsd-xl font-heading break-words text-zsd-on-surface first:mt-0"

const HEADINGS = {
  h2: "text-zsd-headline-md",
  h3: "text-zsd-headline-sm",
  h4: "text-zsd-body-lg font-semibold",
  h5: "text-zsd-body-md font-semibold",
  h6: "text-zsd-body-md font-semibold",
}

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

function text(value: string | boolean | undefined) {
  return typeof value === "string" ? value : undefined
}

function element(node: MarkdownElement, key: number): ReactNode {
  const attrs = node.attrs ?? {}
  const children = node.children && nodes(node.children)
  const id = text(attrs.id)

  switch (node.tag) {
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const Tag = node.tag
      return (
        <Tag key={key} id={id} className={cn(HEADING, HEADINGS[Tag])}>
          {children}
        </Tag>
      )
    }
    case "p":
      return (
        <p key={key} className={BLOCK}>
          {children}
        </p>
      )
    case "ul":
      return (
        <ul key={key} className={cn(BLOCK, "list-disc ps-zsd-xl")}>
          {children}
        </ul>
      )
    case "ol":
      return (
        <ol
          key={key}
          start={attrs.start ? Number(attrs.start) : undefined}
          className={cn(BLOCK, "list-decimal ps-zsd-xl")}
        >
          {children}
        </ol>
      )
    case "li":
      return (
        <li
          key={key}
          id={id}
          className="mt-zsd-xs [&>ol]:mt-zsd-xs [&>ul]:mt-zsd-xs"
        >
          {children}
        </li>
      )
    case "blockquote":
      return (
        <blockquote
          key={key}
          className={cn(
            BLOCK,
            "border-s-2 border-zsd-outline ps-zsd-lg text-zsd-on-surface-muted"
          )}
        >
          {children}
        </blockquote>
      )
    case "hr":
      return <hr key={key} className="my-zsd-xl border-zsd-outline-muted" />
    case "br":
      return <br key={key} />
    // Other sites open in a new tab, without access to this one.
    case "a": {
      const href = text(attrs.href)
      return isExternal(href) ? (
        <a
          key={key}
          id={id}
          href={href}
          title={text(attrs.title)}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK}
        >
          {children}
        </a>
      ) : (
        <a
          key={key}
          id={id}
          href={href}
          title={text(attrs.title)}
          className={LINK}
        >
          {children}
        </a>
      )
    }
    // Uploads (`/media/<key>`) go through Cloudflare Images. The CSP allows no
    // other origin, so an image from elsewhere is only its alt text.
    case "img": {
      const alt = text(attrs.alt) ?? ""
      const media = mediaKey(attrs.src)
      if (!media) return alt ? <span key={key}>{alt}</span> : null
      return (
        <img
          key={key}
          src={imageUrl(media, 960)}
          srcSet={IMAGE_WIDTHS.map((w) => `${imageUrl(media, w)} ${w}w`).join(
            ", "
          )}
          sizes={IMAGE_SIZES}
          alt={alt}
          title={text(attrs.title)}
          loading="lazy"
          decoding="async"
          className="block h-auto max-w-full"
        />
      )
    }
    // Inline code; blocks are `pre` nodes of their own.
    case "code":
      return (
        <code
          key={key}
          dir="ltr"
          className="bg-zsd-surface-raised px-1 font-zsd-code-md text-[0.875em] break-words"
        >
          {children}
        </code>
      )
    // A task list's box: shown, not a control.
    case "input":
      return (
        <input
          key={key}
          type="checkbox"
          defaultChecked={attrs.checked === true}
          disabled
          className="me-zsd-xs align-middle"
        />
      )
    // A wide table scrolls in its own region, like code.
    case "table":
      return (
        <div key={key} tabIndex={0} className={cn(BLOCK, "overflow-x-auto")}>
          <table className="w-full border-collapse text-zsd-body-sm">
            {children}
          </table>
        </div>
      )
    case "th":
      return (
        <th
          key={key}
          className="border border-zsd-outline-muted bg-zsd-surface-raised px-zsd-sm py-zsd-xs text-start font-semibold"
        >
          {children}
        </th>
      )
    case "td":
      return (
        <td
          key={key}
          className="border border-zsd-outline-muted px-zsd-sm py-zsd-xs"
        >
          {children}
        </td>
      )
    case "section":
      return (
        <section key={key} id={id} className={BLOCK}>
          {children}
        </section>
      )
    default: {
      // em, strong, del, sup, thead, tbody, tr: as they are.
      const Tag = node.tag
      return (
        <Tag key={key} id={id}>
          {children}
        </Tag>
      )
    }
  }
}

function nodes(list: MarkdownNode[]): ReactNode[] {
  return list.map((node, key) => {
    if (typeof node === "string") return node
    if (node.tag === "pre") {
      return (
        <CodeBlock
          key={key}
          code={node.code}
          language={node.language}
          lines={node.lines}
        />
      )
    }
    return element(node, key)
  })
}

// A Markdown tree (`markdownTree`, @contracts/markdown/parse) as React
// elements: Case Studies and Posts, rendered on the Worker, and the admin's
// preview. The tree holds no raw HTML and no unsafe URL; this only gives each
// element the site's look.
export function Markdown({
  tree,
  lang,
  dir,
  className,
}: {
  tree: MarkdownTree
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
      {nodes(tree)}
    </div>
  )
}
