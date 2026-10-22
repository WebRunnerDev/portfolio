import { describe, expect, it } from "vitest"

import {
  ALT_OFFSET,
  imageMarkdown,
  insertAt,
  placeholder,
  replaceIn,
} from "./markdown-images"

const at = (position: number) => ({ start: position, end: position })

describe("insertAt", () => {
  it("replaces the selection and puts the caret after the insert", () => {
    expect(insertAt("ab cd", { start: 2, end: 3 }, "X")).toEqual({
      text: "abXcd",
      selection: at(3),
    })
  })
})

describe("replaceIn", () => {
  const p = placeholder(1)
  const image = imageMarkdown("/media/image/a.png")

  it("puts a caret left right after the placeholder inside the alt text", () => {
    const text = `Hi ${p}`
    expect(replaceIn(text, at(text.length), p, image, ALT_OFFSET)).toEqual({
      text: `Hi ${image}`,
      selection: at(3 + ALT_OFFSET),
    })
  })

  it("keeps a selection before the placeholder and shifts one after it", () => {
    const text = `ab ${p} cd`
    expect(replaceIn(text, { start: 0, end: 2 }, p, image)?.selection).toEqual({
      start: 0,
      end: 2,
    })
    const after = text.length - 1
    expect(replaceIn(text, at(after), p, image)?.selection).toEqual(
      at(after + image.length - p.length)
    )
  })

  it("removes a placeholder, the caret where it was", () => {
    const text = `ab${p}cd`
    expect(replaceIn(text, at(2 + p.length), p, "")).toEqual({
      text: "abcd",
      selection: at(2),
    })
  })

  it("finds each placeholder by its id", () => {
    const text = `${placeholder(1)}\n\n${placeholder(2)}`
    expect(replaceIn(text, at(0), placeholder(2), "B")?.text).toBe(
      `${placeholder(1)}\n\nB`
    )
  })

  it("gives null once the placeholder is gone", () => {
    expect(replaceIn("edited", at(0), p, image)).toBeNull()
  })
})
