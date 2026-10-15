import { api } from "./api"

// ADR-0001: static assets + /api/*. Meta Injection for HTML lands in a later stage.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
