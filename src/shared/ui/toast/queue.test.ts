import { describe, expect, it, vi } from "vitest"

// The queue is one for the visit: a fresh module per test.
async function queue() {
  vi.resetModules()
  return import("./queue")
}

describe("notify", () => {
  it("leaves the toaster unloaded until the first message", async () => {
    const { notify, onNotify, wasNotified } = await queue()
    // The toaster's mount listens from the start: that alone doesn't count.
    onNotify(() => {})
    expect(wasNotified()).toBe(false)
    notify("lagged")
    expect(wasNotified()).toBe(true)
  })

  it("keeps messages until the toaster takes them, once", async () => {
    const { notify, takeQueued } = await queue()
    notify("one")
    notify("two")
    expect(takeQueued()).toEqual(["one", "two"])
    expect(takeQueued()).toEqual([])
  })

  it("tells the listeners of each message, not after unsubscribing", async () => {
    const { notify, onNotify } = await queue()
    const listener = vi.fn()
    const off = onNotify(listener)
    notify("one")
    off()
    notify("two")
    expect(listener).toHaveBeenCalledOnce()
  })
})
