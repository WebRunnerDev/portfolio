import { createFileRoute, redirect } from "@tanstack/react-router"

import { DEFAULT_LANG, isLang, withLang, type Lang } from "@contracts/lang"
import { DirectionProvider } from "@/app/providers"
import { PrintCvPage, loadCv } from "@/pages/cv"
import { LangHead } from "@/shared/i18n"
import { PageError, PagePending } from "@/shared/ui/page-state"

// The Print CV (ADR-0003) sits outside the `/$lang` layout: no header,
// footer or menu. It checks the Lang like that layout and is always light.
export const Route = createFileRoute("/$lang_/cv/print")({
  params: { parse: ({ lang }) => ({ lang: lang as Lang }) },
  beforeLoad: ({ params, location }) => {
    if (!isLang(params.lang)) {
      throw redirect({
        href: withLang(location.pathname, DEFAULT_LANG) + location.searchStr,
        replace: true,
      })
    }
  },
  staticData: { theme: "light" },
  loader: ({ params, abortController }) =>
    loadCv(params.lang, abortController.signal, "print"),
  pendingComponent: () => <PagePending title="nav.cv" />,
  errorComponent: () => <PageError title="nav.cv" />,
  component: () => (
    <DirectionProvider>
      <LangHead />
      <PrintCvPage />
    </DirectionProvider>
  ),
})
