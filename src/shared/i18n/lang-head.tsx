import { useEffect } from "react"
import { useLocation } from "@tanstack/react-router"

import { DEFAULT_LANG, LANGS, withLang } from "@contracts/lang"

import { useLang } from "./use-lang"

// `<html lang>` and hreflang alternates for the current path. React hoists the
// <link>s into <head>. The Worker will inject the same tags for crawlers (ADR-0001).
export function LangHead() {
  const lang = useLang()
  const { pathname } = useLocation()
  const { origin } = window.location

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <>
      {LANGS.map((l) => (
        <link
          key={l}
          rel="alternate"
          hrefLang={l}
          href={origin + withLang(pathname, l)}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={origin + withLang(pathname, DEFAULT_LANG)}
      />
    </>
  )
}
