import { describe, expect, it } from "vitest"

import designMd from "../../../../DESIGN.md?raw"
import tokensCss from "../../../styles/tokens.css?raw"
import { DURATION, EASE, STAGGER } from "./tokens"

// `    easing-enter: cubic-bezier(0.16, 1, 0.3, 1)` under x-zsd.motion.
const designValue = (name: string) =>
  designMd.match(new RegExp(`^ {4}${name}: (.+)$`, "m"))?.[1]
const cssValue = (name: string) =>
  tokensCss.match(new RegExp(`--zsd-x-zsd-motion-${name}: ([^;]+);`))?.[1]

const bezier = (curve: readonly number[]) => `cubic-bezier(${curve.join(", ")})`
const ms = (seconds: number) => `${Math.round(seconds * 1000)}ms`

const TOKENS: [string, string][] = [
  ...Object.entries(EASE).map(([k, v]): [string, string] => [
    `easing-${k}`,
    bezier(v),
  ]),
  ["duration-fast", ms(DURATION.fast)],
  ["duration-base", ms(DURATION.base)],
  ["duration-slow", ms(DURATION.slow)],
  ["duration-reveal", ms(DURATION.reveal)],
  ["choreography-max", ms(DURATION.choreographyMax)],
  ["stagger-word", ms(STAGGER.word)],
  ["stagger-item", ms(STAGGER.item)],
]

describe("motion tokens", () => {
  it.each(TOKENS)("%s matches DESIGN.md and tokens.css", (name, value) => {
    expect(designValue(name)).toBe(value)
    expect(cssValue(name)).toBe(value)
  })

  it("covers every easing in DESIGN.md", () => {
    const easings = [...designMd.matchAll(/^ {4}(easing-[\w-]+):/gm)].map(
      (m) => m[1]
    )
    expect(easings.sort()).toEqual(
      Object.keys(EASE)
        .map((k) => `easing-${k}`)
        .sort()
    )
  })
})
