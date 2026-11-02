import { use } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"

import type { Album } from "@contracts/api/public"
import { imageSrcSet, imageUrl } from "@contracts/media"
import { useLang, useT, useTPlural } from "@/shared/i18n"
import { CARD_TITLE_SHIFT, CardCorner } from "@/shared/ui/card"
import { Reveal } from "@/shared/ui/reveal"

import { HomeSection } from "./home-section"

const MOTION_FAST =
  "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none"

// How many Album covers the banner shows.
const COVERS = 3

// The Gallery (docs/design-brief.md › Ритм главной): airy, one banner that
// leads to the Gallery, a card: the call, how many Albums and photos there
// are, and the first covers. The banner is the section's link. Not shown
// without an Album with photos.
export function GallerySection({ albums }: { albums: Promise<Album[]> }) {
  const lang = useLang()
  const t = useT()
  const tp = useTPlural()
  const list = use(albums)
  if (list.length === 0) return null

  const photos = list.reduce((sum, album) => sum + album.photoCount, 0)

  return (
    <HomeSection
      id="gallery"
      title={t("nav.gallery")}
      wide
      className="pt-zsd-section-lg"
    >
      <Reveal order={1} className="mt-zsd-xl">
        <Link
          to="/$lang/gallery"
          params={{ lang }}
          className="group/card focus-chamfer-md relative block"
        >
          <span
            className={`block bg-zsd-outline-muted p-px chamfer-md card-active:bg-zsd-primary ${MOTION_FAST}`}
          >
            <span className="flex flex-col gap-zsd-xl bg-zsd-surface-raised p-zsd-xl chamfer-md sm:flex-row sm:items-center sm:justify-between">
              <span className="flex flex-col gap-zsd-xs">
                <span className="font-heading text-zsd-headline-sm break-words text-zsd-on-surface">
                  <span className={CARD_TITLE_SHIFT}>
                    {t("home.gallery.link")}
                    <ArrowRight
                      aria-hidden
                      strokeWidth={1.5}
                      className="ms-zsd-sm inline size-4 align-[-0.1em] text-zsd-primary-text rtl:rotate-180"
                    />
                  </span>
                </span>
                <span className="text-zsd-body-sm text-zsd-on-surface-muted">
                  {tp("home.gallery.albums", list.length)}
                  {" · "}
                  {tp("album.photos", photos)}
                </span>
              </span>
              {/* Decorative: the text names the link. */}
              <span
                aria-hidden="true"
                className="grid grid-cols-3 gap-zsd-sm sm:w-96 sm:shrink-0"
              >
                {list
                  .slice(0, COVERS)
                  .map(
                    (album) =>
                      album.cover && (
                        <img
                          key={album.id}
                          src={imageUrl(album.cover.key, 320)}
                          srcSet={imageSrcSet(
                            album.cover.key,
                            album.cover.width
                          )}
                          sizes="(min-width: 640px) 120px, 30vw"
                          width={album.cover.width}
                          height={album.cover.height}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="aspect-4/3 w-full bg-zsd-surface object-cover"
                        />
                      )
                  )}
              </span>
            </span>
          </span>
          <CardCorner />
        </Link>
      </Reveal>
    </HomeSection>
  )
}
