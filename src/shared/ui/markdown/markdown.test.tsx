import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Markdown } from "./markdown"

const render = (markdown: string) =>
  renderToStaticMarkup(<Markdown>{markdown}</Markdown>)

describe("Markdown", () => {
  it("drops raw HTML, inline and as blocks", () => {
    const html = render(
      [
        "Hello <b>there</b> <img src=x onerror=alert(1)>",
        "",
        "<script>alert(1)</script>",
        "",
        '<div onclick="alert(1)">block</div>',
        "",
        "<iframe src=https://evil.example></iframe>",
      ].join("\n")
    )
    expect(html).not.toMatch(/<(b|script|div onclick|iframe|img)\b/)
    expect(html).not.toContain("onerror")
    expect(html).not.toContain("alert(1)")
    expect(html).toContain("Hello ")
  })

  it("empties javascript: and data: URLs", () => {
    const html = render(
      "[click](javascript:alert(1)) ![x](data:image/png;base64,AAAA)"
    )
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("data:")
  })

  it("opens external links in a new tab with rel=noopener", () => {
    const html = render("[GitHub](https://github.com/me) and [CV](/en/cv)")
    expect(html).toContain(
      '<a href="https://github.com/me" target="_blank" rel="noopener noreferrer"'
    )
    expect(html).toMatch(/<a href="\/en\/cv" class="[^"]*">CV<\/a>/)
  })

  it("serves uploads through Cloudflare Images, other images as alt text", () => {
    const html = render(
      "![The map](/media/projects/plot%20ops.png)\n\n![Elsewhere](https://evil.example/x.png)"
    )
    expect(html).toContain(
      'src="/cdn-cgi/image/width=960,fit=scale-down,format=auto/media/projects/plot%20ops.png"'
    )
    expect(html).toContain(
      "/cdn-cgi/image/width=1920,fit=scale-down,format=auto/media/projects/plot%20ops.png 1920w"
    )
    expect(html).toContain('alt="The map"')
    expect(html).toContain('loading="lazy"')
    expect(html).not.toContain("evil.example")
    expect(html).toContain("<span>Elsewhere</span>")
  })

  it("keeps code blocks left to right with their language", () => {
    const html = render("```ts\nconst a = 1 < 2\n```\n\nUse `npm ci`.")
    expect(html).toMatch(
      /<pre dir="ltr" tabindex="0" data-language="ts" class="[^"]*"><code>const a = 1 &lt; 2<\/code><\/pre>/
    )
    expect(html).toMatch(/<code dir="ltr" class="[^"]*">npm ci<\/code>/)
  })

  it("puts its headings below the page title", () => {
    const html = render("# Problem\n\n## Approach\n\n###### Detail")
    expect(html).toMatch(/<h2 [^>]*>Problem<\/h2>/)
    expect(html).toMatch(/<h3 [^>]*>Approach<\/h3>/)
    expect(html).toMatch(/<h6 [^>]*>Detail<\/h6>/)
    expect(html).not.toContain("<h1")
  })

  it("starts at h2 whatever level its top heading has", () => {
    const html = render("## Problem\n\n> ### Note\n\n#### Detail")
    expect(html).toMatch(/<h2 [^>]*>Problem<\/h2>/)
    expect(html).toMatch(/<h3 [^>]*>Note<\/h3>/)
    expect(html).toMatch(/<h4 [^>]*>Detail<\/h4>/)
  })

  it("renders GFM tables in their own scroll region", () => {
    const html = render("| A | B |\n| - | - |\n| 1 | 2 |")
    expect(html).toMatch(
      /<div tabindex="0" class="[^"]*overflow-x-auto[^"]*"><table/
    )
    expect(html).toContain(">1</td>")
  })

  it("marks the text with its language", () => {
    expect(renderToStaticMarkup(<Markdown lang="en">Hi</Markdown>)).toMatch(
      /^<div lang="en"/
    )
  })
})
