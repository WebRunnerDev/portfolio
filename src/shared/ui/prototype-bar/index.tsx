import * as React from "react"

import {
  PROTO,
  PROTO_LABELS,
  proto,
  prototypeShown,
  setProto,
  type ProtoKey,
  type ProtoValue,
} from "@/shared/lib/prototype"

// PROTOTYPE, branch spike/path-to-10 only. A pill at the bottom: each
// switch with arrows either side; a click reloads with the next value.
// Folds to a small tab so it doesn't sit on the page being judged.
export function PrototypeBar() {
  const [open, setOpen] = React.useState(true)
  if (!prototypeShown()) return null

  const cycle = <K extends ProtoKey>(key: K, by: number) => {
    const values = PROTO[key] as readonly ProtoValue<K>[]
    const at = values.indexOf(proto(key))
    setProto(key, values[(at + by + values.length) % values.length])
  }

  return (
    <div
      dir="ltr"
      data-prototype-bar
      className="fixed inset-x-0 bottom-3 z-[1000] mx-auto w-fit font-mono text-[12px] leading-none"
    >
      {open ? (
        <div className="flex max-w-[calc(100vw-16px)] flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full bg-black/85 px-3 py-2 text-white shadow-lg ring-1 ring-white/25">
          <span className="text-[#ffb020]">PROTO</span>
          {(Object.keys(PROTO) as ProtoKey[]).map((key) => (
            <span key={key} className="flex items-center gap-1">
              <span className="text-white/60">{PROTO_LABELS[key]}</span>
              <button
                type="button"
                aria-label={`${PROTO_LABELS[key]}: назад`}
                onClick={() => cycle(key, -1)}
                className="px-1.5 py-1 hover:text-[#ffb020]"
              >
                ‹
              </button>
              <span className="min-w-14 text-center">{proto(key)}</span>
              <button
                type="button"
                aria-label={`${PROTO_LABELS[key]}: вперёд`}
                onClick={() => cycle(key, 1)}
                className="px-1.5 py-1 hover:text-[#ffb020]"
              >
                ›
              </button>
            </span>
          ))}
          <button
            type="button"
            aria-label="Свернуть"
            onClick={() => setOpen(false)}
            className="px-1.5 py-1 text-white/60 hover:text-white"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-black/85 px-3 py-2 text-[#ffb020] shadow-lg ring-1 ring-white/25"
        >
          PROTO
        </button>
      )}
    </div>
  )
}
