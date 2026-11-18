import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  READER_INPUT,
  SETTLE_MS,
  settleScroll,
  type SettleEnv,
} from "./settle-scroll"

const position = { top: 2100, left: 0 }

// A page that grows when told to, and the scroll it was put to.
function page() {
  let onGrow: (() => void) | undefined
  const env: SettleEnv & { grow: () => void } = {
    input: new EventTarget(),
    scrollTo: vi.fn(),
    observeSize: vi.fn((callback) => {
      onGrow = callback
      return () => {
        onGrow = undefined
      }
    }),
    grow: () => onGrow?.(),
  }
  return env
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("settleScroll", () => {
  it("puts the scroll back at once and each time the page grows", () => {
    const env = page()
    settleScroll(position, env)
    env.grow()
    env.grow()
    expect(env.scrollTo).toHaveBeenCalledTimes(3)
    expect(env.scrollTo).toHaveBeenLastCalledWith(position)
  })

  it.each(READER_INPUT)("lets go once the reader moves it (%s)", (type) => {
    const env = page()
    settleScroll(position, env)
    env.input.dispatchEvent(new Event(type))
    env.grow()
    expect(env.scrollTo).toHaveBeenCalledOnce()
  })

  it("lets go of a page that keeps changing after SETTLE_MS", () => {
    const env = page()
    settleScroll(position, env)
    vi.advanceTimersByTime(SETTLE_MS)
    env.grow()
    expect(env.scrollTo).toHaveBeenCalledOnce()
  })

  it("lets go on the next page change", () => {
    const env = page()
    const stop = settleScroll(position, env)
    stop()
    env.grow()
    env.input.dispatchEvent(new Event("wheel"))
    expect(env.scrollTo).toHaveBeenCalledOnce()
  })
})
