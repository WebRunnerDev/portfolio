import { afterEach, describe, expect, it, vi } from "vitest"

import {
  UploadQueue,
  type UploadQueueOptions,
  type UploadSnapshot,
} from "./upload-queue"

// A promise the test settles by hand.
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

const file = (name: string) => new File(["x"], name)
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function setup(overrides: Partial<UploadQueueOptions<string>> = {}) {
  const uploads = new Map<string, ReturnType<typeof deferred<string>>>()
  const saved: string[] = []
  const discarded: string[] = []
  let snapshot: UploadSnapshot = { items: [], paused: false }
  const queue = new UploadQueue<string>({
    concurrency: 2,
    upload: (f) => {
      const upload = deferred<string>()
      uploads.set(f.name, upload)
      return upload.promise
    },
    save: async (key) => {
      saved.push(key)
    },
    discard: (key) => discarded.push(key),
    isRateLimited: (error) => error === "429",
    describe: (error) => `failed: ${String(error)}`,
    pauseMs: 1000,
    onChange: (next) => (snapshot = next),
    ...overrides,
  })
  const statuses = () => snapshot.items.map((item) => item.status)
  return {
    queue,
    uploads,
    saved,
    discarded,
    statuses,
    snapshot: () => snapshot,
  }
}

afterEach(() => vi.useRealTimers())

describe("UploadQueue", () => {
  it("runs at most `concurrency` uploads at once", async () => {
    const { queue, uploads, statuses } = setup()
    queue.add(["a", "b", "c", "d"].map(file))
    expect([...uploads.keys()]).toEqual(["a", "b"])
    expect(statuses()).toEqual(["uploading", "uploading", "queued", "queued"])

    uploads.get("a")!.resolve("key-a")
    await flush()
    expect([...uploads.keys()]).toEqual(["a", "b", "c"])
  })

  it("saves in the order the files were added", async () => {
    const { queue, uploads, saved, statuses } = setup()
    queue.add(["a", "b"].map(file))
    uploads.get("b")!.resolve("key-b")
    await flush()
    expect(saved).toEqual([])
    expect(statuses()).toEqual(["uploading", "saving"])

    uploads.get("a")!.resolve("key-a")
    await flush()
    expect(saved).toEqual(["key-a", "key-b"])
    expect(statuses()).toEqual(["done", "done"])
  })

  it("keeps going past a failed file and retries it", async () => {
    const { queue, uploads, saved, snapshot, statuses } = setup()
    queue.add(["a", "b"].map(file))
    uploads.get("a")!.reject("413")
    uploads.get("b")!.resolve("key-b")
    await flush()
    expect(saved).toEqual(["key-b"])
    expect(statuses()).toEqual(["failed", "done"])
    expect(snapshot().items[0].error).toBe("failed: 413")

    queue.retry(snapshot().items[0].id)
    uploads.get("a")!.resolve("key-a")
    await flush()
    expect(saved).toEqual(["key-b", "key-a"])
  })

  it("retries only the save when the upload went through", async () => {
    let fail = true
    const { queue, uploads, saved, snapshot, statuses } = setup({
      save: async (key) => {
        if (fail) throw new Error("422")
        saved.push(key)
      },
    })
    queue.add([file("a")])
    uploads.get("a")!.resolve("key-a")
    await flush()
    expect(statuses()).toEqual(["failed"])

    fail = false
    uploads.clear()
    queue.retry(snapshot().items[0].id)
    await flush()
    expect(uploads.size).toBe(0)
    expect(saved).toEqual(["key-a"])
  })

  it("pauses everything on a rate limit, then goes on", async () => {
    vi.useFakeTimers()
    const { queue, uploads, snapshot, statuses } = setup({ concurrency: 1 })
    queue.add(["a", "b"].map(file))
    uploads.get("a")!.reject("429")
    await vi.advanceTimersByTimeAsync(0)
    expect(statuses()).toEqual(["queued", "queued"])
    expect(snapshot().paused).toBe(true)

    uploads.clear()
    await vi.advanceTimersByTimeAsync(1000)
    expect(snapshot().paused).toBe(false)
    expect([...uploads.keys()]).toEqual(["a"])
  })

  it("discards uploads that will never be saved", async () => {
    const { queue, uploads, discarded, snapshot } = setup({
      save: () => Promise.reject(new Error("422")),
    })
    queue.add(["a", "b", "c"].map(file))
    uploads.get("a")!.resolve("key-a")
    await flush()
    queue.dismiss(snapshot().items[0].id)
    expect(discarded).toEqual(["key-a"])
    expect(snapshot().items).toHaveLength(2)

    uploads.get("b")!.resolve("key-b")
    await flush()
    queue.dispose()
    uploads.get("c")!.resolve("key-c")
    await flush()
    expect(discarded).toEqual(["key-a", "key-b", "key-c"])
  })
})
