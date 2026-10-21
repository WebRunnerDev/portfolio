// `?photo=<id>`: the photo open in the Lightbox, so a link can share it.
// Anything but a positive integer leaves it closed.
export type PhotoSearch = { photo?: number }

export function parsePhotoSearch(search: Record<string, unknown>): PhotoSearch {
  const photo = Number(search.photo)
  return Number.isInteger(photo) && photo > 0 ? { photo } : {}
}
