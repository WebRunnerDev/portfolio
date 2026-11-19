// Messages for the toaster, waiting for its chunk to load and mount.
const queued: string[] = []
const listeners = new Set<() => void>()
let notified = false

// Shows `message` in a toast. The first call loads the toaster's chunk
// (sonner), so a visit that never needs a toast never loads it.
export function notify(message: string) {
  notified = true
  queued.push(message)
  for (const listener of listeners) listener()
}

// Whether anything was ever asked to show: the toaster mounts from then on.
export const wasNotified = () => notified

// The messages not shown yet, taken off the queue.
export const takeQueued = () => queued.splice(0)

// Calls `listener` on each `notify`; returns the unsubscribe.
export function onNotify(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
