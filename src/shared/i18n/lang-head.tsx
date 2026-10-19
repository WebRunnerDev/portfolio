import { useEffect } from "react"
import { useLocation, useMatches } from "@tanstack/react-router"

import {
  alternates,
  pageMeta,
  pageUrl,
  parsePagePath,
  type PageMeta,
} from "@contracts/meta"

import { useLang } from "./use-lang"

// The meta a loader returns with its data (`{ meta, … }`), for pages whose
// meta comes from D1, the same the Worker injects (worker/meta/pages.ts).
function useLoaderMeta(): PageMeta | undefined {
  return useMatches({
    select: (matches) => {
      const data = matches.findLast(
        ({ loaderData }) =>
          typeof loaderData === "object" &&
          loaderData !== null &&
          "meta" in loaderData
      )?.loaderData as { meta: PageMeta } | undefined
      return data?.meta
    },
  })
}

// `<html lang>`, title, description, canonical and hreflang of the current
// page, from the same contracts/meta.ts the Worker injects them with
// (ADR-0001). React hoists the tags into <head>. A path no page has gets only
// hreflang: NotFoundPage renders its own title.
export function LangHead() {
  const lang = useLang()
  const { pathname } = useLocation()
  const { origin } = window.location
  const path = parsePagePath(pathname)?.path ?? ""
  const meta = useLoaderMeta() ?? pageMeta(lang, path)

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
