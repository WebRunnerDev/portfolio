import { describe, expect, it } from "vitest"

import {
  CRAWL_AT,
  FADE_MS,
  GATHER_AT,
  GATHER_MS,
  INDEXED_AT,
  intro,
  INTRO_MS,
  readout,
  WEB_SPREAD,
} from "./intro"

describe("intro", () => {
  it("fades in scattered, then crawls the web before the gather", () => {
    expect(intro(0)).toMatchObject({
      crawling: false,
      gather: 0,
      spread: WEB_SPREAD,
      mask: 0,
    })
    expect(intro(CRAWL_AT).crawling).toBe(true)
    expect(intro(FADE_MS).mask).toBe(1)
    expect(intro(INDEXED_AT - 1)).toMatchObject({
      crawling: true,
      indexed: false,
      gather: 0,
    })
  })

  it("indexes, then gathers on easing-layout while the web draws in", () => {
    expect(intro(INDEXED_AT)).toMatchObject({ crawling: false, indexed: true })
    const half = intro(GATHER_AT + GATHER_MS / 2)
    expect(half.gather).toBeCloseTo(0.5)
    expect(half.spread).toBeCloseTo((WEB_SPREAD + 1) / 2)
    expect(intro(GATHER_AT + GATHER_MS * 0.1).gather).toBeLessThan(0.1)
  })

  it("is done once gathered, the web at its size", () => {
    expect(intro(INTRO_MS)).toMatchObject({
      gather: 1,
      spread: 1,
      mask: 1,
      done: true,
    })
    expect(intro(INTRO_MS + 60_000).done).toBe(true)
  })
})

describe("readout", () => {
  it("counts the nodes lit, then all of them", () => {
    expect(readout(intro(CRAWL_AT), 12, 57)).toBe("Crawling · 12 nodes")
    expect(readout(intro(INDEXED_AT), 40, 57)).toBe("Indexed · 57 nodes")
  })
})
