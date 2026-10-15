import type { ReactNode } from "react"

// A section page before its content lands: the title and a short note.
export function PageStub({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg py-zsd-section md:px-zsd-xxl lg:py-zsd-section-lg">
      <h1 className="font-heading text-zsd-headline-md break-words md:text-zsd-headline-lg">
        {title}
      </h1>
      <div className="mt-zsd-lg max-w-(--zsd-x-zsd-layout-prose-max) text-zsd-body-lg text-zsd-on-surface-muted">
        {children}
      </div>
    </div>
  )
}
