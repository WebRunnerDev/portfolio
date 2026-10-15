// ADR-0001: static assets + /api/*. Meta Injection for HTML lands in a later stage.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, url)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>

function handleApi(request: Request, url: URL): Response {
  if (url.pathname === "/api/health") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return Response.json(
        { error: "method_not_allowed" },
        { status: 405, headers: { Allow: "GET, HEAD" } }
      )
    }
    return Response.json({ status: "ok" })
  }

  return Response.json({ error: "not_found" }, { status: 404 })
}
