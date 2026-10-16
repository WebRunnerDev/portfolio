import { useEffect } from "react"
import { useLocation } from "@tanstack/react-router"

import { alternates, pageMeta, pageUrl, parsePagePath } from "@contracts/meta"

import { useLang } from "./use-lang"

// `<html lang>`, title, description, canonical and hreflang of the current
// page, from the same contracts/meta.ts the Worker injects them with
// (ADR-0001). React hoists the tags into <head>. A path no page has gets only
// hreflang: NotFoundPage renders its own title.
export function LangHead() {
  const lang = useLang()
  const { pathname } = useLocation()
  const { origin } = window.location
  const path = parsePagePath(pathname)?.path ?? ""
  const meta = pageMeta(lang, path)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // The Worker's tags would go stale on the first navigation.
  useEffect(() => {
    for (const el of document.head.querySelectorAll("[data-meta]")) {
      el.remove()
    }
  }, [])

  return (
    <>
      {meta && (
        <>
          <title>{meta.title}</title>
          <meta name="description" content={meta.description} />
          {meta.noindex && <meta name="robots" content="noindex" />}
          <link rel="canonical" href={pageUrl(origin, lang, path)} />
        </>
      )}
      {alternates(origin, path).map(({ hrefLang, href }) => (
        <link key={hrefLang} rel="alternate" hrefLang={hrefLang} href={href} />
      ))}
    </>
  )
}
