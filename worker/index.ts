import { api } from "./api"
import { cvPdfLang, serveCvPdf } from "./cv-pdf/serve"
import { serveMedia } from "./media/serve"
import { servePage, serveWithoutLang } from "./meta/serve-page"
import { rssLang, serveRss } from "./rss/serve"
import { assetRequest, securePage } from "./security/headers"
import { SITEMAP_PATH, serveSitemap } from "./sitemap/serve"

const isAdmin = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/")

// The SPA's index.html for a path no file has (`not_found_handling`), or `/`
// itself: a page without a Lang. The Admin's pages are the SPA's too.
function isPageWithoutLang(request: Request, url: URL, asset: Response) {
  return (
    (request.method === "GET" || request.method === "HEAD") &&
    !isAdmin(url.pathname) &&
    !!asset.headers.get("Content-Type")?.includes("text/html")
  )
}

// ADR-0001: static assets + /api/* + /media/* + the CV PDF + the RSS feeds +
// the sitemap + Meta Injection for pages under a Lang; a page without a Lang
// redirects to one or is a 404. Hashed assets in /assets/* never reach the
// Worker. Every HTML answer gets the security headers and the CSP.
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
    if (url.pathname === SITEMAP_PATH) return serveSitemap(request, env)

    const page = await servePage(request, env)
    if (page) return securePage(page, url)

    const asset = await env.ASSETS.fetch(assetRequest(request))
    if (isPageWithoutLang(request, url, asset)) {
      await asset.body?.cancel()
      return securePage(await serveWithoutLang(request, env), url)
    }
    const response = securePage(asset, url)
    if (!isAdmin(url.pathname)) return response
    // Behind Access anyway (ADR-0004); the header keeps it out of an index
    // even if a crawler gets through.
    const admin = new Response(response.body, response)
    admin.headers.set("X-Robots-Tag", "noindex")
    return admin
  },
} satisfies ExportedHandler<Env>
