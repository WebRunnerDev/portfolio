import { useRouter } from "@tanstack/react-router"

import { useT, type MessageKey } from "@/shared/i18n"
import { Button, Skeleton } from "@/shared/ui/kit"
import { PageStub } from "@/shared/ui/page-stub"

// What a route with a loader shows while its data loads (`pendingComponent`)
// and when it fails (`errorComponent`). Both keep the page's title, so the
// layout doesn't jump when the data lands. PagePending without `title` (a page
// named by its data) shows a skeleton line in its place.

export function PagePending({ title }: { title?: MessageKey }) {
  const t = useT()

  return (
    <div aria-busy="true" className="contents">
      <PageStub title={title && t(title)}>
        <span className="sr-only">{t("load.pending")}</span>
        <div aria-hidden="true" className="flex flex-col gap-zsd-sm">
          <Skeleton className="h-lh w-full" />
          <Skeleton className="h-lh w-5/6" />
          <Skeleton className="h-lh w-2/3" />
        </div>
      </PageStub>
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
