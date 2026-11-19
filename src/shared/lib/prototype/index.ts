// PROTOTYPE, branch spike/page-head only, never merged to main.
// docs/plan.md › Этап 7 › п. 10: the head of the pages other than home. A value comes from the URL
// (`?head=band`) and is kept for the session, so it survives page changes;
// the bar (`PrototypeBar`) sets them.

export const PROTO = {
  // The head of an inner page: as now; the page as its home chapter opened
  // (figure, full stop, rule, a readout of what is in it); a strip of the
  // page's own items as rhombi, one each, tied to the cards; both.
  head: ["plain", "chapter", "data", "both"],
} as const

export type ProtoKey = keyof typeof PROTO
export type ProtoValue<K extends ProtoKey> = (typeof PROTO)[K][number]

export const PROTO_LABELS: Record<ProtoKey, string> = {
  head: "Шапка",
}

const STORE = "proto:"

function stored(key: ProtoKey) {
  try {
    return sessionStorage.getItem(STORE + key)
  } catch {
    return null
  }
}

function store(key: ProtoKey, value: string) {
  try {
    sessionStorage.setItem(STORE + key, value)
  } catch {
    // A blocked storage: the URL still carries it.
  }
}

export function proto<K extends ProtoKey>(key: K): ProtoValue<K> {
  const values = PROTO[key] as readonly string[]
  const fromUrl =
    typeof location === "undefined"
      ? null
      : new URLSearchParams(location.search).get(key)
  if (fromUrl && values.includes(fromUrl)) {
    store(key, fromUrl)
    return fromUrl as ProtoValue<K>
  }
  const kept = stored(key)
  if (kept && values.includes(kept)) return kept as ProtoValue<K>
  return values[0] as ProtoValue<K>
}

// Sets a switch and reloads with it in the URL.
export function setProto<K extends ProtoKey>(key: K, value: ProtoValue<K>) {
  store(key, value)
  const url = new URL(location.href)
  url.searchParams.set(key, value)
  location.replace(url)
}

// Not on the production domain, even if this branch were deployed there.
export const prototypeShown = () =>
  typeof location !== "undefined" && location.hostname !== "webrunner.dev"

// The switches on <html> (`data-proto-head="lattice"`…), for CSS.
export function markProto() {
  if (!prototypeShown()) return
  const root = document.documentElement
  for (const key of Object.keys(PROTO) as ProtoKey[]) {
    root.dataset[`proto${key[0].toUpperCase()}${key.slice(1)}`] = proto(key)
  }
}
