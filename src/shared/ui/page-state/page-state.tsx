import { useRouter } from "@tanstack/react-router"

import { useT, type MessageKey } from "@/shared/i18n"
import { Button } from "@/shared/ui/kit"
import { Loader } from "@/shared/ui/loader"
import { PageStub } from "@/shared/ui/page-stub"

// What a route with a loader shows while its data loads (`pendingComponent`)
// and when it fails (`errorComponent`). Both keep the page's title, so the
// layout doesn't jump when the data lands. PagePending without `title` (a page
// named by its data) shows a skeleton line in its place. The router renders
// them only after LOADER_DELAY_MS, so the Loader shows at once.

export function PagePending({ title }: { title?: MessageKey }) {
  const t = useT()

  return (
    <div aria-busy="true" className="contents">
      <PageStub title={title && t(title)}>
        <Loader delay={false} />
      </PageStub>
    </div>
  )
}

// The router's `defaultPendingComponent`: a route whose code is still loading
// (every route's component is a chunk of its own) and that has no
// `pendingComponent` of its own, the admin's included.
export function PageLoading() {
  return (
    <div
      aria-busy="true"
      className="grid min-h-[50svh] flex-1 place-items-center p-zsd-lg"
    >
      <Loader delay={false} />
    </div>
  )
}

export function PageError({ title }: { title: MessageKey }) {
  const t = useT()
  const router = useRouter()

  return (
    <PageStub title={t(title)}>
      <p role="alert">{t("load.failed")}</p>
      <Button
        variant="outline"
        className="mt-zsd-md"
        onClick={() => void router.invalidate()}
      >
        {t("load.retry")}
      </Button>
    </PageStub>
  )
}
