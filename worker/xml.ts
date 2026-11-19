// Text for XML: markup escaped, and the control characters XML 1.0 has no
// place for dropped, so no text from D1 breaks a feed or the sitemap.
export function xml(value: string) {
  return (
    value
      // eslint-disable-next-line no-control-regex -- dropping them is the point
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;")
  )
}
