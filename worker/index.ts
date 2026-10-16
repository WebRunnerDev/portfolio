import { api } from "./api"
import { serveMedia } from "./media/serve"
import { servePage } from "./meta/serve-page"

// ADR-0001: static assets + /api/* + /media/* + Meta Injection for pages
// under a Lang. Hashed assets in /assets/* never reach the Worker.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx)
    }
    if (url.pathname.startsWith("/media/")) {
      return serveMedia(request, env)
    }

    return (await servePage(request, env)) ?? env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
