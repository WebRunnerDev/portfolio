import type { ReactNode } from "react"

import { Skeleton } from "@/shared/ui/kit"

const TITLE_CLASS =
  "font-heading text-zsd-headline-md break-words md:text-zsd-headline-lg"

// A section page before its content lands: the title and a short note. No
// `title` while it loads: a skeleton line of the same height takes its place.
export function PageStub({
  title,
  children,
}: {
  title: string | undefined
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg py-zsd-section md:px-zsd-xxl lg:py-zsd-section-lg">
      {title === undefined ? (
        <Skeleton className={`${TITLE_CLASS} h-lh w-2/3`} />
      ) : (
        <h1 className={TITLE_CLASS}>{title}</h1>
      )}
      <div className="mt-zsd-lg max-w-(--zsd-x-zsd-layout-prose-max) text-zsd-body-lg text-zsd-on-surface-muted">
        {children}
      </div>
    </div>
  )
}
