// PROTOTYPE, branch spike/path-to-10 only, never merged to main.
// docs/design-brief.md › Главная на Swarm › Путь к 10: switches the owner
// flips in the browser to pick between variants. A value comes from the URL
// (`?scroll=heavy`) and is kept for the session, so it survives page changes;
// the bar (`PrototypeBar`) sets them.

export const PROTO = {
  // Weighted scroll (Lenis) at the full tier, by how heavy it feels.
  scroll: ["native", "light", "medium", "heavy"],
  // Leaving a page: the current crossfade, a curtain of rhombi, or (from
  // the home page) the Swarm's dust blown off over the next page.
  transition: ["cut", "curtain", "dust"],
  // A chapter's figure and its block: as now, the block as the figure's full
  // stop, part of the dust tracing the figure, or the figure made of dust.
  numeral: ["plain", "stop", "outline", "fill"],
} as const

export type ProtoKey = keyof typeof PROTO
export type ProtoValue<K extends ProtoKey> = (typeof PROTO)[K][number]

export const PROTO_LABELS: Record<ProtoKey, string> = {
  scroll: "Скролл",
  transition: "Переход",
  numeral: "Цифры",
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

// Sets a switch and reloads with it in the URL: the scene and the scroll
// are laid again from the start.
export function setProto<K extends ProtoKey>(key: K, value: ProtoValue<K>) {
  store(key, value)
  const url = new URL(location.href)
  url.searchParams.set(key, value)
  location.replace(url)
}

// Not on the production domain, even if this branch were deployed there.
export const prototypeShown = () =>
  typeof location !== "undefined" && location.hostname !== "webrunner.dev"

// The switches on <html> (`data-proto-transition="curtain"`…), for CSS.
export function markProto() {
  if (!prototypeShown()) return
  const root = document.documentElement
  for (const key of Object.keys(PROTO) as ProtoKey[]) {
    root.dataset[`proto${key[0].toUpperCase()}${key.slice(1)}`] = proto(key)
  }
}

export { SmoothScroll } from "./smooth-scroll"
