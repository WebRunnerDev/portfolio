import { lazy, Suspense } from "react"
import { Link, getRouteApi, useRouter } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import type { Photo } from "@contracts/api/public"
import { imageSrcSet, imageUrl } from "@contracts/media"
import { useLang, useT, useTPlural } from "@/shared/i18n"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"

import { photoAlt } from "../lib/photo-alt"

const route = getRouteApi("/$lang/gallery/$slug")

// The Lightbox isn't on the first paint (but for a shared link), so it loads
// lazily when a photo opens.
const Lightbox = lazy(() =>
  import("./lightbox").then((m) => ({ default: m.Lightbox }))
)

// Two columns, three from `sm`, four from `lg` in the 1200px content box
// (DESIGN.md › Responsive behavior).
const PHOTO_SIZES = "(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"

// The first row at four columns loads at once, the first photo first: it is
// the LCP. Lower ones wait until they come near the screen.
const EAGER_PHOTOS = 4

// Masonry without a script: a grid whose row is 1/50 of a column's width
// (`--row`, from the container's width), so a photo spans rows by its aspect
// ratio alone. Auto-placement keeps D1's order, row by row, in the shortest
// column. The gap is in rows too. The classes of the grid repeat both numbers.
const ROWS_PER_WIDTH = 50
const GAP_ROWS = 3

function rowSpan({ width, height }: Photo) {
  return Math.round((ROWS_PER_WIDTH * height) / width) + GAP_ROWS
}

const thumbnailId = (photo: Photo) => `photo-${photo.id}`

// An Album's photos in D1's order under its title (CONTEXT.md › Album). A
// photo without a caption is named by its place in the album. Each one is a
// link to `?photo=<id>`, which opens it in the Lightbox; Back closes it.
export function AlbumPage() {
  const lang = useLang()
  const t = useT()
  const tp = useTPlural()
  const router = useRouter()
  const navigate = route.useNavigate()
  const { album } = route.useLoaderData()
  const { photo: openId } = route.useSearch()
  const { photos } = album
  const openIndex = photos.findIndex((photo) => photo.id === openId)

  // Paging replaces the entry, so Back leaves the Lightbox whatever the photo.
  const showPhoto = (index: number) =>
    navigate({
      search: { photo: photos[index].id },
      state: true,
      replace: true,
      resetScroll: false,
      viewTransition: false,
    })

  // Opened from this page: go Back to the entry before it. From a shared
  // link there is none, so the photo leaves the URL.
  const close = () => {
    if (router.state.location.state.lightbox) router.history.back()
    else navigate({ search: {}, replace: true, resetScroll: false })
  }

  return (
    <div className="mx-auto w-full max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg py-zsd-section md:px-zsd-xxl lg:py-zsd-section-lg">
      <Link
        to="/$lang/gallery"
        params={{ lang }}
        className="inline-flex min-h-zsd-control-height items-center gap-zsd-xs text-zsd-body-sm text-zsd-primary-text underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeft
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-4 rtl:rotate-180"
        />
        {t("nav.gallery")}
      </Link>
      <header className="mt-zsd-lg flex flex-col items-start gap-zsd-md">
        <h1
          lang={fallbackLang(album)}
          className="font-heading text-zsd-headline-md break-words md:text-zsd-headline-lg"
        >
          {album.title}
        </h1>
        <FallbackNotice fallback={album.fallback} />
        <p className="text-zsd-body-sm text-zsd-on-surface-muted">
          {tp("album.photos", photos.length)}
        </p>
      </header>
      {photos.length > 0 && (
        <div className="@container mt-zsd-xl">
          <ul
            data-testid="album-photos"
            className="grid auto-rows-(--row) grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-[calc(var(--row)*3)] [--cols:2] [--row:calc(100cqi/(50*var(--cols)+3*(var(--cols)-1)))] sm:[--cols:3] lg:[--cols:4]"
          >
            {photos.map((photo, i) => (
              <li
                key={photo.id}
                style={{ gridRowEnd: `span ${rowSpan(photo)}` }}
                className="pb-[calc(var(--row)*3)]"
              >
                <Link
                  id={thumbnailId(photo)}
                  from="/$lang/gallery/$slug"
                  to="."
                  search={{ photo: photo.id }}
                  state={{ lightbox: true }}
                  resetScroll={false}
                  className="block size-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <img
                    src={imageUrl(photo.key, Math.min(640, photo.width))}
                    srcSet={imageSrcSet(photo.key, photo.width)}
                    sizes={PHOTO_SIZES}
                    width={photo.width}
                    height={photo.height}
                    alt={photoAlt(photo, i, photos.length, lang)}
                    lang={fallbackLang(photo)}
                    decoding="async"
                    {...(i === 0 && { fetchPriority: "high" as const })}
                    {...(i >= EAGER_PHOTOS && { loading: "lazy" as const })}
                    className="size-full bg-zsd-surface object-cover"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {openIndex >= 0 && (
        <Suspense>
          <Lightbox
            title={album.title}
            titleLang={fallbackLang(album)}
            photos={photos}
            index={openIndex}
            onIndexChange={showPhoto}
            onClose={close}
            onClosed={(photo) =>
              document.getElementById(thumbnailId(photo))?.focus()
            }
          />
        </Suspense>
      )}
    </div>
  )
}
