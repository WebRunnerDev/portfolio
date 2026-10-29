// The production build with content, for Lighthouse CI (lighthouserc.json) and
// the axe tests (playwright.config.ts, project `audit`): `vite preview` over a
// fresh local D1 and R2 of their own in .wrangler/audit, migrated and filled
// from scripts/audit/seed.sql. Expects dist/ to be built.
//   node scripts/audit/server.mjs <port>
//
// `vite preview` listens on <port> + 1 behind a proxy on <port> that serves
// it the way Cloudflare's edge does: over HTTP/2 (TLS, a self-signed
// certificate made at start; clients skip its check) and with text
// compressed (brotli, else gzip). Locally workerd speaks HTTP/1.1 and sends
// text raw: Lighthouse would queue the page's scripts on six connections and
// weigh the uncompressed JS.
import { execFileSync, spawn } from "node:child_process"
import { readFileSync, rmSync } from "node:fs"
import { request } from "node:http"
import { createSecureServer } from "node:http2"
import { pipeline } from "node:stream"
import { createBrotliCompress, createGzip } from "node:zlib"

const STATE = ".wrangler/audit"
const port = Number(process.argv[2] ?? "4175")
const vitePort = port + 1
const shell = process.platform === "win32"

const COMPRESSIBLE =
  /^(text\/|application\/(javascript|json|xml|rss\+xml|manifest\+json)|image\/svg\+xml)/

const openssl = (...args) =>
  execFileSync("openssl", args, { stdio: ["ignore", "ignore", "inherit"] })

// Headers HTTP/2 has no place for, both ways.
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
])
const forward = (headers) =>
  Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) => !name.startsWith(":") && !HOP_BY_HOP.has(name)
    )
  )

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

openssl(
  "req",
  "-x509",
  "-newkey",
  "rsa:2048",
  "-nodes",
  "-days",
  "1",
  "-subj",
  "/CN=localhost",
  "-keyout",
  `${STATE}/key.pem`,
  "-out",
  `${STATE}/cert.pem`
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

createSecureServer(
  {
    key: readFileSync(`${STATE}/key.pem`),
    cert: readFileSync(`${STATE}/cert.pem`),
    // curl and the readiness checks may still ask for HTTP/1.1.
    allowHTTP1: true,
  },
  (req, res) => {
    const upstream = request(
      {
        port: vitePort,
        path: req.url,
        method: req.method,
        headers: {
          ...forward(req.headers),
          host: req.headers[":authority"] ?? req.headers.host,
          "accept-encoding": "identity",
        },
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
        const headers = forward(answer.headers)
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
  }
).listen(port)
