import { useEffect, useRef, useState } from "react"
import type { KeyboardEvent, PointerEvent } from "react"
import { cn } from "cn"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

import type { Photo } from "@contracts/api/public"
import { useLang, useT } from "@/shared/i18n"
import { useDirection } from "@/shared/lib/direction"
import { fallbackLang } from "@/shared/ui/fallback-notice"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/shared/ui/kit"

import { lightboxImage, preloadPhoto } from "../lib/lightbox-image"
import { photoAlt, photoPlace } from "../lib/photo-alt"

// A swipe this far (px) turns the page; a shorter one springs back.
const SWIPE_DISTANCE = 50

type LightboxProps = {
  title: string
  titleLang: string | undefined
  photos: Photo[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  // The thumbnail of the photo shown last takes the focus back.
  onClosed: (photo: Photo) => void
}

// One photo of an Album over the whole screen (#88). Radix traps the focus
// and closes on Esc. ←/→ and swipes turn the pages along the reading
// direction, round the ends; the photo itself is never mirrored.
export function Lightbox({
  title,
  titleLang,
  photos,
  index,
  onIndexChange,
  onClose,
  onClosed,
}: LightboxProps) {
  const lang = useLang()
  const t = useT()
  const { flipX } = useDirection()
  const photo = photos[index]
  const total = photos.length
  const swipe = useRef<{ pointer: number; x: number } | null>(null)
  const [offset, setOffset] = useState(0)

  // `step` 1 is the next photo in the album, -1 the previous one.
  const turn = (step: number) => onIndexChange((index + step + total) % total)

  useEffect(() => {
    if (total < 2) return
    preloadPhoto(photos[(index + 1) % total])
    preloadPhoto(photos[(index - 1 + total) % total])
  }, [photos, index, total])

  // The arrow toward the inline end goes forward: → in LTR, ← in RTL.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    turn(flipX(event.key === "ArrowRight" ? 1 : -1))
  }

  // Touch and pen only (they capture the pointer by themselves): the photo
  // follows the finger, then turns the page if it went far enough. A swipe
  // toward the inline start goes forward.
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" || !event.isPrimary || total < 2) return
    swipe.current = { pointer: event.pointerId, x: event.clientX }
  }
  const onPointerMove = (event: PointerEvent) => {
    if (swipe.current?.pointer !== event.pointerId) return
    setOffset(event.clientX - swipe.current.x)
  }
  const onPointerUp = (event: PointerEvent) => {
    if (swipe.current?.pointer !== event.pointerId) return
    const distance = event.clientX - swipe.current.x
    swipe.current = null
    setOffset(0)
    if (Math.abs(distance) >= SWIPE_DISTANCE) turn(flipX(distance) < 0 ? 1 : -1)
  }
  const onPointerCancel = () => {
    swipe.current = null
    setOffset(0)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onKeyDown={onKeyDown}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onClosed(photo)
        }}
        className="inset-0 flex size-full max-w-none translate-0 flex-col gap-0 rounded-none bg-zsd-surface p-0 text-zsd-on-surface ring-0 duration-(--zsd-x-zsd-motion-duration-base) ease-zsd-enter sm:max-w-none rtl:translate-0 data-open:zoom-in-100 motion-reduce:data-open:animate-none data-closed:ease-zsd-exit data-closed:zoom-out-100"
      >
        <DialogTitle lang={titleLang} className="sr-only">
          {title}
        </DialogTitle>
        <div className="flex h-(--zsd-x-zsd-layout-header-height) shrink-0 items-center gap-zsd-md border-b border-border px-zsd-lg md:px-zsd-xxl">
          <p
            role="status"
            data-testid="lightbox-counter"
            className="text-zsd-body-sm text-zsd-on-surface-muted"
          >
            {photoPlace(index, total, lang)}
          </p>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={t("lightbox.close")}
              title={t("lightbox.close")}
              className="ms-auto"
            >
              <X aria-hidden />
            </Button>
          </DialogClose>
        </div>
        <figure className="relative flex min-h-0 flex-1 flex-col items-center gap-zsd-md p-zsd-lg">
          <div
            data-testid="lightbox-stage"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            className="flex min-h-0 w-full flex-1 touch-pan-y touch-pinch-zoom items-center justify-center"
          >
            <img
              key={photo.id}
              {...lightboxImage(photo)}
              width={photo.width}
              height={photo.height}
              alt={photoAlt(photo, index, total, lang)}
              lang={fallbackLang(photo)}
              draggable={false}
              style={offset ? { translate: `${offset}px` } : undefined}
              className={cn(
                "size-full animate-in object-contain duration-(--zsd-x-zsd-motion-duration-base) ease-zsd-enter fade-in-0 select-none motion-reduce:animate-none",
                offset === 0 &&
                  "transition-[translate] ease-zsd-enter motion-reduce:transition-none"
              )}
            />
          </div>
          {photo.caption && (
            <figcaption
              lang={fallbackLang(photo)}
              className="max-w-prose shrink-0 text-center text-zsd-body-md break-words"
            >
              {photo.caption}
            </figcaption>
          )}
          {total > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon-lg"
                aria-label={t("lightbox.previous")}
                title={t("lightbox.previous")}
                onClick={() => turn(-1)}
                className="absolute inset-s-zsd-sm top-1/2 -translate-y-1/2 md:inset-s-zsd-lg"
              >
                <ChevronLeft aria-hidden className="rtl:rotate-180" />
              </Button>
              <Button
                variant="secondary"
                size="icon-lg"
                aria-label={t("lightbox.next")}
                title={t("lightbox.next")}
                onClick={() => turn(1)}
                className="absolute inset-e-zsd-sm top-1/2 -translate-y-1/2 md:inset-e-zsd-lg"
              >
                <ChevronRight aria-hidden className="rtl:rotate-180" />
              </Button>
            </>
          )}
        </figure>
      </DialogContent>
    </Dialog>
  )
}
