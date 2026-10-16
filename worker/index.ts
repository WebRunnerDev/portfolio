import { api } from "./api"
import { serveMedia } from "./media/serve"
import { servePage } from "./meta/serve-page"
import { assetRequest, securePage } from "./security/headers"

// ADR-0001: static assets + /api/* + /media/* + Meta Injection for pages
// under a Lang. Hashed assets in /assets/* never reach the Worker. Every HTML
// answer gets the security headers and the CSP.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx)
    }
    if (url.pathname.startsWith("/media/")) {
      return serveMedia(request, env)
    }

    const response =
      (await servePage(request, env)) ??
      (await env.ASSETS.fetch(assetRequest(request)))
    return securePage(response, url)
  },
} satisfies ExportedHandler<Env>
