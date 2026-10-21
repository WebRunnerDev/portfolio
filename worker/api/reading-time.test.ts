import { describe, expect, it } from "vitest"
import { readingMinutes } from "./reading-time"

const words = (count: number) => Array(count).fill("word").join(" ")

describe("readingMinutes", () => {
  it("is 1 for an empty or blank text", () => {
    expect(readingMinutes("")).toBe(1)
    expect(readingMinutes("  \n\n ")).toBe(1)
  })

  it("counts 200 words a minute, rounded up", () => {
    expect(readingMinutes(words(200))).toBe(1)
    expect(readingMinutes(words(201))).toBe(2)
    expect(readingMinutes(words(1000))).toBe(5)
  })

  it("counts words in any script", () => {
    expect(readingMinutes(Array(401).fill("слово").join(" "))).toBe(3)
    expect(readingMinutes(Array(201).fill("كلمة").join(" "))).toBe(2)
  })

  it("leaves out code blocks and inline code", () => {
    const code = Array(300).fill("const x = 1").join("\n")
    expect(readingMinutes(`${words(150)}\n\n\`\`\`ts\n${code}\n\`\`\`\n`)).toBe(
      1
    )
    expect(readingMinutes(`${words(150)}\n\n~~~\n${code}\n~~~`)).toBe(1)
    // Never closed: code to the end.
    expect(readingMinutes(`${words(150)}\n\n\`\`\`\n${code}`)).toBe(1)
    const indented = code.replace(/^/gm, "    ")
    expect(readingMinutes(`${words(150)}\n\n${indented}`)).toBe(1)
    const inline = Array(300).fill("`npm run build`").join(" ")
    expect(readingMinutes(`${words(150)} ${inline}`)).toBe(1)
  })

  it("counts the text of markup, not the markup", () => {
    const markup = [
      "# Title",
      "",
      "**bold** _italic_ ~~gone~~ > quote",
      "",
      "- one",
      "1. two",
      "",
      "| a | b |",
      "| --- | --- |",
      "",
      "[a link](https://example.com/some/long/path) ![a photo](/media/x.jpg)",
      "<span>html</span> https://bare.example.com/url",
      "",
      "[ref]: https://example.com",
    ].join("\n")
    // Title bold italic gone quote one two a b a link a photo html
    expect(readingMinutes(`${markup}\n\n${words(186)}`)).toBe(1)
    expect(readingMinutes(`${markup}\n\n${words(187)}`)).toBe(2)
  })
})
