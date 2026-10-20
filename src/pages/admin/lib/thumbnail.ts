import { imageUrl, mediaUrl } from "@contracts/media"

// A small copy of an image for the admin's lists. Resized copies exist only
// on the zone (worker/README.md › Media).
export function thumbnail(key: string) {
  return location.hostname === "webrunner.dev"
    ? imageUrl(key, 160)
    : mediaUrl(key)
}
