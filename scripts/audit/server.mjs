// The production build with content, for Lighthouse CI (lighthouserc.json) and
// the axe tests (playwright.config.ts, project `audit`): `vite preview` over a
// fresh local D1 and R2 of their own in .wrangler/audit, migrated and filled
// from scripts/audit/seed.sql. Expects dist/ to be built.
//   node scripts/audit/server.mjs <port>
//
// `vite preview` listens on <port> + 1 behind a proxy on <port> that
// compresses text the way Cloudflare's edge does (brotli, else gzip): locally
// workerd sends it raw, and Lighthouse would weigh the uncompressed JS.
import { execFileSync, spawn } from "node:child_process"
import { rmSync } from "node:fs"
import { createServer, request } from "node:http"
import { pipeline } from "node:stream"
import { createBrotliCompress, createGzip } from "node:zlib"

const STATE = ".wrangler/audit"
const port = Number(process.argv[2] ?? "4175")
const vitePort = port + 1
const shell = process.platform === "win32"

const COMPRESSIBLE =
  /^(text\/|application\/(javascript|json|xml|rss\+xml|manifest\+json)|image\/svg\+xml)/

const wrangler = (...args) =>
  execFileSync("npx", ["wrangler", ...args, "--local", "--persist-to", STATE], {
    stdio: "inherit",
    shell,
    env: { ...process.env, CI: "true" },
  })

rmSync(STATE, { recursive: true, force: true })
wrangler("d1", "migrations", "apply", "DB")
wrangler("d1", "execute", "DB", "--file", "scripts/audit/seed.sql")
// Local runs bind MEDIA to `preview_bucket_name` (wrangler.jsonc).
wrangler(
  "r2",
  "object",
  "put",
  "webrunner-media-preview/image/audit.png",
  "--file",
  "public/og-default.png",
  "--content-type",
  "image/png"
)

const vite = spawn(
  "npx",
  ["vite", "preview", "--port", String(vitePort), "--strictPort"],
  // vite.config.ts keeps the Worker's local state there.
  { stdio: "inherit", shell, env: { ...process.env, E2E_STATE: STATE } }
)
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => vite.kill(signal))
}
vite.on("exit", (code) => process.exit(code ?? 0))

createServer((req, res) => {
  const upstream = request(
    {
      port: vitePort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, "accept-encoding": "identity" },
    },
    (answer) => {
      // The browser gave up on it (Lighthouse leaves pages mid-load): piping
      // into a closed response throws and would stop the server.
      if (res.destroyed) {
        answer.resume()
        return
      }
      const accepts = req.headers["accept-encoding"] ?? ""
      const type = answer.headers["content-type"] ?? ""
      const encoder =
        req.method === "HEAD" ||
        answer.headers["content-encoding"] ||
        !COMPRESSIBLE.test(type)
          ? null
          : /\bbr\b/.test(accepts)
            ? ["br", createBrotliCompress()]
            : /\bgzip\b/.test(accepts)
              ? ["gzip", createGzip()]
              : null
      const headers = { ...answer.headers }
      if (encoder) {
        delete headers["content-length"]
        headers["content-encoding"] = encoder[0]
        headers.vary = headers.vary
          ? `${headers.vary}, Accept-Encoding`
          : "Accept-Encoding"
      }
      res.writeHead(answer.statusCode ?? 502, headers)
      if (encoder) pipeline(answer, encoder[1], res, () => {})
      else pipeline(answer, res, () => {})
    }
  )
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502)
    res.end()
  })
  pipeline(req, upstream, () => {})
}).listen(port)
