import type { Album, AlbumCover } from "@contracts/api/public"
import { imageSrcSet, imageUrl } from "@contracts/media"
import { useTPlural } from "@/shared/i18n"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"
import { Logo } from "@/shared/ui/logo"

// One column below `sm`, two from `sm`, three from `lg` in the 1200px content
// box (DESIGN.md › Responsive behavior), as the Projects grid.
const COVER_SIZES = "(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"

function Cover({
  cover,
  priority,
}: {
  cover: AlbumCover | null
  priority: boolean
}) {
  if (!cover) {
    return (
      <div
        aria-hidden="true"
        className="flex aspect-4/3 items-center justify-center bg-zsd-surface"
      >
        <Logo className="size-16 text-zsd-outline-muted" />
      </div>
    )
  }
  // Decorative: the title next to it names the card. `width`/`height` give
  // the box its size before the file loads; the crop keeps the grid even.
  return (
    <img
      src={imageUrl(cover.key, 640)}
      srcSet={imageSrcSet(cover.key, cover.width)}
      sizes={COVER_SIZES}
      width={cover.width}
      height={cover.height}
      alt=""
      decoding="async"
      {...(priority
        ? { fetchPriority: "high" as const }
        : { loading: "lazy" as const })}
      className="aspect-4/3 w-full bg-zsd-surface object-cover"
    />
  )
}

// An Album's card (CONTEXT.md › Album) on the Gallery page: its cover, title
// and how many photos it has. `priority` loads the cover at once: the first
// card's is the LCP.
export function AlbumCard({
  album,
  priority = false,
}: {
  album: Album
  priority?: boolean
}) {
  const tp = useTPlural()

  return (
    <article data-testid="album-card" className="h-full">
      {/* DESIGN.md › Shapes: the outer layer draws the chamfered border. */}
      <div className="h-full bg-zsd-outline-muted p-px chamfer-md">
        <div className="flex h-full flex-col gap-zsd-md bg-zsd-surface-raised p-zsd-xl chamfer-md">
          <Cover cover={album.cover} priority={priority} />
          <h2
            lang={fallbackLang(album)}
            className="min-w-0 font-heading text-zsd-headline-sm break-words text-zsd-on-surface"
          >
            {album.title}
          </h2>
          <FallbackNotice fallback={album.fallback} />
          <p className="mt-auto text-zsd-body-sm text-zsd-on-surface-muted">
            {tp("album.photos", album.photoCount)}
          </p>
        </div>
      </div>
    </article>
  )
}
