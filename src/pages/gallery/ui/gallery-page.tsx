import { getRouteApi } from "@tanstack/react-router"

import { AlbumCard } from "./album-card"
import { useT } from "@/shared/i18n"

const route = getRouteApi("/$lang/gallery")

// The Albums in D1's order: one column, two from `sm`, three from `lg`
// (DESIGN.md › Responsive behavior). An empty list says what appears there.
export function GalleryPage() {
  const t = useT()
  const albums = route.useLoaderData()

  return (
    <div className="mx-auto w-full max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg py-zsd-section md:px-zsd-xxl lg:py-zsd-section-lg">
      <h1 className="font-heading text-zsd-headline-md break-words md:text-zsd-headline-lg">
        {t("nav.gallery")}
      </h1>
      {albums.length > 0 ? (
        <ul className="mt-zsd-xl grid gap-zsd-xl sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album, i) => (
            <li key={album.id}>
              <AlbumCard album={album} priority={i === 0} />
            </li>
          ))}
        </ul>
      ) : (
        <div
          data-testid="gallery-empty"
          className="mt-zsd-xl flex flex-col items-center gap-zsd-md border border-zsd-outline-muted bg-zsd-surface-raised p-zsd-xl text-center"
        >
          <div aria-hidden="true" className="flex gap-zsd-xs">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-3 rotate-45 bg-zsd-outline-muted" />
            ))}
          </div>
          <h2 className="font-heading text-zsd-headline-sm text-zsd-on-surface">
            {t("gallery.empty.title")}
          </h2>
          <p className="max-w-(--zsd-x-zsd-layout-prose-max) text-zsd-body-sm text-zsd-on-surface-muted">
            {t("gallery.empty.text")}
          </p>
        </div>
      )}
    </div>
  )
}
