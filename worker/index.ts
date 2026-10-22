import { api } from "./api"
import { cvPdfLang, serveCvPdf } from "./cv-pdf/serve"
import { serveMedia } from "./media/serve"
import { servePage } from "./meta/serve-page"
import { rssLang, serveRss } from "./rss/serve"
import { assetRequest, securePage } from "./security/headers"

// ADR-0001: static assets + /api/* + /media/* + the CV PDF + the RSS feeds +
// Meta Injection for pages under a Lang. Hashed assets in /assets/* never
// reach the Worker. Every HTML answer gets the security headers and the CSP.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx)
    }
    if (url.pathname.startsWith("/media/")) {
      return serveMedia(request, env)
    }
    const cvPdf = cvPdfLang(url.pathname)
    if (cvPdf) return serveCvPdf(request, env, cvPdf)
    const rss = rssLang(url.pathname)
    if (rss) return serveRss(request, env, rss)

    const response =
      (await servePage(request, env)) ??
      (await env.ASSETS.fetch(assetRequest(request)))
    return securePage(response, url)
  },
} satisfies ExportedHandler<Env>
