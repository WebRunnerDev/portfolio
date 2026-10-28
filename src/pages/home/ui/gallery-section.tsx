import { use } from "react"
import { Link } from "@tanstack/react-router"
import { cn } from "cn"

import type { Album } from "@contracts/api/public"
import { imageSrcSet, imageUrl } from "@contracts/media"
import { useLang, useT, useTPlural } from "@/shared/i18n"
import { sharedCover } from "@/shared/lib/view-transition"
import { CARD_TITLE_SHIFT, CardCorner } from "@/shared/ui/card"
import { fallbackLang } from "@/shared/ui/fallback-notice"
import { Reveal } from "@/shared/ui/reveal"

import { HomeSection } from "./home-section"

const MOTION_FAST =
  "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none"

// The strip starts where the content box does and runs to the viewport's
// end edge: the content's padding, plus half of what the viewport has over
// `content-max`.
const STRIP_START =
  "ps-[max(var(--zsd-spacing-lg),calc((100%-var(--zsd-x-zsd-layout-content-max))/2+var(--zsd-spacing-lg)))] scroll-ps-[max(var(--zsd-spacing-lg),calc((100%-var(--zsd-x-zsd-layout-content-max))/2+var(--zsd-spacing-lg)))] md:ps-[max(var(--zsd-spacing-xxl),calc((100%-var(--zsd-x-zsd-layout-content-max))/2+var(--zsd-spacing-xxl)))] md:scroll-ps-[max(var(--zsd-spacing-xxl),calc((100%-var(--zsd-x-zsd-layout-content-max))/2+var(--zsd-spacing-xxl)))]"

// The Gallery (docs/design-brief.md › Home rhythm): airy, one strip of
// Album covers that runs past the content's end edge and scrolls in its own
// region. Each cover links to its Album and answers hover and focus as a
// card. Leads to the Gallery. Not shown without an Album with photos.
export function GallerySection({ albums }: { albums: Promise<Album[]> }) {
  const lang = useLang()
  const t = useT()
  const tp = useTPlural()
  const list = use(albums)
  if (list.length === 0) return null

  return (
    <HomeSection
      id="gallery"
      title={t("home.gallery.title")}
      link="/$lang/gallery"
      linkText={t("home.gallery.link")}
      className="pt-zsd-section-lg"
      content={false}
    >
      <ul
        className={cn(
          "mt-zsd-xl flex snap-x snap-proximity [scrollbar-width:thin] gap-zsd-xl overflow-x-auto pe-zsd-lg pb-zsd-md",
          STRIP_START
        )}
      >
        {list.map((album, i) => (
          <Reveal
            as="li"
            key={album.id}
            order={Math.min(i, 3)}
            className="w-72 shrink-0 snap-start sm:w-96"
          >
            <Link
              to="/$lang/gallery/$slug"
              params={{ lang, slug: album.slug }}
              className="group/card focus-chamfer-md relative block"
            >
              <span
                className={`block bg-zsd-outline-muted p-px chamfer-md card-active:bg-zsd-primary ${MOTION_FAST}`}
              >
                {album.cover && (
                  // Decorative: the title under it names the link. It grows
                  // into its photo on the Album's page.
                  <img
                    {...sharedCover("album", album.slug)}
                    src={imageUrl(album.cover.key, 640)}
                    srcSet={imageSrcSet(album.cover.key, album.cover.width)}
                    sizes="(min-width: 640px) 384px, 288px"
                    width={album.cover.width}
                    height={album.cover.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-4/3 w-full bg-zsd-surface object-cover chamfer-md"
                  />
                )}
              </span>
              <CardCorner />
              <span
                lang={fallbackLang(album)}
                className="mt-zsd-md block font-heading text-zsd-headline-sm break-words text-zsd-on-surface"
              >
                <span className={CARD_TITLE_SHIFT}>{album.title}</span>
              </span>
              <span className="mt-zsd-xs block text-zsd-body-sm text-zsd-on-surface-muted">
                {tp("album.photos", album.photoCount)}
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </HomeSection>
  )
}
