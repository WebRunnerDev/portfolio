import { useLang, useT } from "@/shared/i18n"

import { formatMonth } from "../lib/format-month"

export function Month({ value }: { value: string }) {
  const lang = useLang()
  return <time dateTime={value}>{formatMonth(value, lang)}</time>
}

// `end` null is "present".
export function Period({ start, end }: { start: string; end: string | null }) {
  const t = useT()
  return (
    <p>
      <Month value={start} /> – {end ? <Month value={end} /> : t("cv.present")}
    </p>
  )
}
