import type { Photo } from "@contracts/api/public"
import { imageSrcSet, imageUrl } from "@contracts/media"

// The Lightbox shows a photo whole: as wide as the screen, or as tall as it
// less the bar and the caption, whichever comes first.
export function lightboxSizes({ width, height }: Photo) {
  return `min(100vw, ${Math.round((80 * width) / height)}vh)`
}

export function lightboxImage(photo: Photo) {
  return {
    src: imageUrl(photo.key, Math.min(1280, photo.width)),
    srcSet: imageSrcSet(photo.key, photo.width),
    sizes: lightboxSizes(photo),
  }
}

// Loads the photo in the size the Lightbox will pick from its srcset, so the
// next one shows at once.
export function preloadPhoto(photo: Photo) {
  const image = new Image()
  const { src, srcSet, sizes } = lightboxImage(photo)
  image.decoding = "async"
  image.sizes = sizes
  image.srcset = srcSet
  image.src = src
}
