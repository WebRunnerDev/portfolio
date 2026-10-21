import type { Photo } from "@contracts/api/public"
import type { Lang } from "@contracts/lang"
import { formatNumber, translate } from "@/shared/i18n"

// A photo is named by its caption, else by its place in the album.
export function photoAlt(
  photo: Photo,
  index: number,
  total: number,
  lang: Lang
) {
  return photo.caption ?? photoPlace(index, total, lang)
}

export function photoPlace(index: number, total: number, lang: Lang) {
  return translate(lang, "album.photo")
    .replace("{n}", formatNumber(index + 1, lang))
    .replace("{total}", formatNumber(total, lang))
}
