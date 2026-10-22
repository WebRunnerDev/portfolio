// Many files, each uploaded and then saved as a row (an album's photos).
// At most `concurrency` uploads run at once; the saves run one by one in the
// order the files were added, so rows get their positions in that order. A
// failed file waits for `retry` while the others go on; a rate-limited one
// pauses the whole queue for `pauseMs` and then goes again by itself.

// Uploads at once; more would only queue up behind the Worker.
export const UPLOAD_CONCURRENCY = 3
// The API's Retry-After on a 429 (worker/api/rate-limit.ts).
export const RATE_LIMIT_PAUSE_MS = 60_000

export type UploadStatus =
  | "queued"
  | "uploading"
  // Uploaded; waiting for the files before it, or being saved.
  | "saving"
  | "done"
  | "failed"

export type UploadItem = {
  id: number
  name: string
  status: UploadStatus
  // 0 to 1, while uploading.
  progress: number
  error?: string
}

export type UploadSnapshot = {
  items: UploadItem[]
  // Rate limited: nothing starts until the pause ends.
  paused: boolean
}

export type UploadQueueOptions<R> = {
  concurrency: number
  upload: (file: File, onProgress: (fraction: number) => void) => Promise<R>
  save: (result: R) => Promise<void>
  // An upload that will never be saved (dismissed, or the queue disposed).
  discard: (result: R) => void
  isRateLimited: (error: unknown) => boolean
  describe: (error: unknown) => string
  pauseMs: number
  onChange: (snapshot: UploadSnapshot) => void
}

type Entry<R> = UploadItem & { file: File; result?: R }

export class UploadQueue<R> {
  private readonly options: UploadQueueOptions<R>
  private entries: Entry<R>[] = []
  private waiting: Entry<R>[] = []
  private active = 0
  private nextId = 1
  private pausedUntil = 0
  private timer?: ReturnType<typeof setTimeout>
  // Resolves when the save of the last started file has settled.
  private saveTail: Promise<void> = Promise.resolve()
  private disposed = false

  constructor(options: UploadQueueOptions<R>) {
    this.options = options
  }

  // The ids of the files added, in their order.
  add(files: Iterable<File>) {
    const ids: number[] = []
    for (const file of files) {
      const entry: Entry<R> = {
        id: this.nextId++,
        name: file.name,
        file,
        status: "queued",
        progress: 0,
      }
      this.entries.push(entry)
      this.waiting.push(entry)
      ids.push(entry.id)
    }
    this.emit()
    this.pump()
    return ids
  }

  retry(id: number) {
    const entry = this.entries.find((item) => item.id === id)
    if (entry?.status !== "failed") return
    this.requeue(entry, false)
  }

  // Forgets a failed or finished file; a failed one's upload is discarded.
  dismiss(id: number) {
    const entry = this.entries.find((item) => item.id === id)
    if (!entry || (entry.status !== "failed" && entry.status !== "done")) {
      return
    }
    if (entry.status === "failed" && entry.result !== undefined) {
      this.options.discard(entry.result)
    }
    this.entries = this.entries.filter((item) => item !== entry)
    this.emit()
  }

  clearDone() {
    this.entries = this.entries.filter((item) => item.status !== "done")
    this.emit()
  }

  // Stops starting files and discards the uploads not saved yet. Uploads in
  // flight are discarded when they finish.
  dispose() {
    this.disposed = true
    clearTimeout(this.timer)
    for (const entry of this.entries) {
      if (entry.status !== "done" && entry.result !== undefined) {
        this.options.discard(entry.result)
      }
    }
  }

  private emit() {
    if (this.disposed) return
    this.options.onChange({
      items: this.entries.map(({ id, name, status, progress, error }) => ({
        id,
        name,
        status,
        progress,
        error,
      })),
      paused: this.pausedUntil > Date.now(),
    })
  }

  private pump() {
    if (this.disposed) return
    const wait = this.pausedUntil - Date.now()
    if (wait > 0) {
      this.timer ??= setTimeout(() => {
        this.timer = undefined
        this.emit()
        this.pump()
      }, wait)
      return
    }
    while (this.active < this.options.concurrency && this.waiting.length) {
      this.active++
      void this.run(this.waiting.shift()!)
    }
  }

  private requeue(entry: Entry<R>, first: boolean) {
    entry.status = "queued"
    entry.progress = 0
    entry.error = undefined
    if (first) this.waiting.unshift(entry)
    else this.waiting.push(entry)
    this.emit()
    this.pump()
  }

  private fail(entry: Entry<R>, error: unknown) {
    if (this.disposed) return
    if (this.options.isRateLimited(error)) {
      this.pausedUntil = Date.now() + this.options.pauseMs
      this.requeue(entry, true)
      return
    }
    entry.status = "failed"
    entry.error = this.options.describe(error)
    this.emit()
  }

  private async run(entry: Entry<R>) {
    // The save turn is taken in start order, which is the order of `add`.
    const turn = this.saveTail
    let release!: () => void
    this.saveTail = new Promise((resolve) => (release = resolve))

    try {
      if (entry.result === undefined) {
        entry.status = "uploading"
        this.emit()
        entry.result = await this.options.upload(entry.file, (fraction) => {
          entry.progress = fraction
          this.emit()
        })
        if (this.disposed) this.options.discard(entry.result)
      }
    } catch (error) {
      this.fail(entry, error)
      void turn.then(release)
      return
    } finally {
      this.active--
      this.pump()
    }

    entry.status = "saving"
    this.emit()
    await turn
    try {
      if (this.disposed) return
      await this.options.save(entry.result)
      entry.status = "done"
      this.emit()
    } catch (error) {
      this.fail(entry, error)
    } finally {
      release()
    }
  }
}
