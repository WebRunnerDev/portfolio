// Security headers and the CSP of every HTML answer (worker/README.md ›
// Security headers). The CSP is Report-Only until the audit of stage 6
// (docs/plan.md) switches it to enforce.
import { CSP_REPORT_PATH } from "@contracts/api/csp-report"
import { ROUTE_ATTRIBUTE } from "@contracts/route-preloads"

// Name of the Reporting-Endpoints entry `report-to` points at.
export const REPORT_GROUP = "csp"

// HSTS is set on the zone (#41), not here.
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Everything off but fullscreen and autoplay, for the player and the
  // gallery. Only features Chrome knows: an unknown one is a console warning.
  "Permissions-Policy": [
    "accelerometer=()",
    "autoplay=(self)",
    "browsing-topics=()",
    "camera=()",
    "display-capture=()",
    "encrypted-media=()",
    "fullscreen=(self)",
    "geolocation=()",
    "gyroscope=()",
    "hid=()",
    "idle-detection=()",
    "magnetometer=()",
    "microphone=()",
    "midi=()",
    "payment=()",
    "picture-in-picture=()",
    "publickey-credentials-get=()",
    "screen-wake-lock=()",
    "serial=()",
    "usb=()",
    "xr-spatial-tracking=()",
  ].join(", "),
  "Cross-Origin-Opener-Policy": "same-origin",
}

// 128 random bits, new for every answer.
export function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

// Scripts run only with the nonce, and whatever they load ('strict-dynamic').
// Styles allow inline: Radix's scroll lock adds <style> tags without a nonce. /media/* and /cdn-cgi/image/* are on the same origin; blob: media is
// the admin reading an audio file's length before upload.
export function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self'",
    "media-src 'self' blob:",
    // Web Analytics beacon (vite.config.ts) reports there.
    "connect-src 'self' https://cloudflareinsights.com",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${REPORT_GROUP}`,
  ].join("; ")
}

// Elements the nonce goes on: every script, and the preloads of scripts,
// which 'strict-dynamic' checks against the nonce too.
const NONCED = 'script, link[rel~="modulepreload"], link[rel~="preload"]'

const CONDITIONS = ["If-None-Match", "If-Modified-Since"]

// The request for ASSETS. A navigation goes without the client's conditions:
// the HTML has a new nonce every time, so a 304 would keep the old one.
export function assetRequest(request: Request) {
  const accept = request.headers.get("Accept") ?? ""
  if (!accept.includes("text/html")) return request
  const headers = new Headers(request.headers)
  for (const name of CONDITIONS) headers.delete(name)
  return new Request(request, { headers })
}

// An HTML answer with the headers above, the CSP and its nonce on every
// script. Anything else passes untouched.
export function securePage(response: Response, url: URL): Response {
  if (!response.headers.get("Content-Type")?.includes("text/html")) {
    return response
  }

  const nonce = createNonce()
  const headers = new Headers(response.headers)
  // The body differs on every request.
  headers.delete("ETag")
  headers.delete("Content-Length")
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value)
  }
  headers.set(
    "Content-Security-Policy-Report-Only",
    contentSecurityPolicy(nonce)
  )
  headers.set(
    "Reporting-Endpoints",
    `${REPORT_GROUP}="${url.origin}${CSP_REPORT_PATH}"`
  )

  const body =
    response.body &&
    new HTMLRewriter()
      .on(NONCED, {
        element(el) {
          el.setAttribute("nonce", nonce)
        },
      })
      // Route preloads no page kept (servePage): this is no page under a
      // Lang.
      .on(`link[${ROUTE_ATTRIBUTE}]`, {
        element(el) {
          el.remove()
        },
      })
      .on("head", {
        // Vite's preload helper puts the nonce of this tag on the
        // <link rel="modulepreload"> of lazy chunks.
        element(el) {
          el.append(`<meta property="csp-nonce" nonce="${nonce}">`, {
            html: true,
          })
        },
      })
      .transform(new Response(response.body, { headers })).body

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
