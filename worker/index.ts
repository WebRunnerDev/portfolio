import { api } from "./api"
import { serveMedia } from "./media/serve"

// ADR-0001: static assets + /api/* + /media/*. Meta Injection for HTML lands
// in a later stage.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx)
    }
    if (url.pathname.startsWith("/media/")) {
      return serveMedia(request, env)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
