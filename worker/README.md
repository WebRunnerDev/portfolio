# worker/

Cloudflare Worker (ADR-0001): serves the SPA through Workers Static Assets, owns `/api/*` and injects the head tags of every page (Meta Injection below). Config lives in `wrangler.jsonc` at the repo root.

Code shared with the frontend (Lang list, UI dictionaries, page meta, API schemas and types) lives in `contracts/`, imported as `@contracts/*` (mapped in `tsconfig.worker.json`); never import from `src/`.

- Hashed build output (`/assets/*`) is served without invoking the Worker; everything else runs it first (`run_worker_first`) and goes to `ASSETS` unless a rule below takes it. Unknown paths fall back to `index.html` (`not_found_handling: "single-page-application"`).
- Pages under a Lang (`/{lang}/…`) get Meta Injection (below). `/api/*` goes to the API below, `/media/*` to the MEDIA bucket (Media below), `/{lang}/cv.pdf` to the CV PDF (CV PDF below), `/{lang}/rss.xml` to the Blog's feed (RSS below). `GET /api/health` → `{"status":"ok"}`.
- `/api/public/:lang/*` reads published content on a Lang (Public API below).
- `/api/*` is rate limited per IP (Rate limits below); pages, assets and `/media/*` are not.
- `/api/*` gives no CORS headers (the SPA is on the same origin, ADR-0001) and refuses writes from other origins (Origin and body limits below).
- `/api/admin/*` needs a Cloudflare Access sign-in (Admin access below). `GET /api/admin/me` → `{"email":"…"}` of the signed-in owner; the rest is CRUD of the content (Admin API below).
- Every HTML answer (pages under a Lang, `/`, `/admin`, the SPA fallback) gets the security headers and a Report-Only CSP with a nonce (Security headers below).

## Meta Injection

ADR-0001: crawlers don't run JS, so `worker/meta/serve-page.ts` rewrites `index.html` with [HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/) for every path whose first segment is a Lang. Other paths (`/`, `/admin`, files in `public/`) pass through untouched.

- **Tags:** `<html lang dir>`, `<title>`, description, `og:type`, `og:site_name`, `og:title`, `og:description`, `og:image` (`/og-default.png` unless the page has its own), `og:url`, `og:locale` (+ `og:locale:alternate`), `twitter:card`, `canonical` and hreflang on all 6 Langs + `x-default` (EN), unless the page lists its own `langs`. URLs use the request's origin; a trailing slash is dropped.
- **Values:** `contracts/meta.ts`, from the UI dictionaries (`nav.*` for titles, `meta.*` for descriptions). `LangHead` (`src/shared/i18n`) renders the same title, description, canonical and hreflang on the client and removes the injected tags (`data-meta`), which would go stale on the first navigation.
- **404:** a path no page has answers 404 with the same SPA, the Not Found title and `noindex`.
- **Previews** (`*.workers.dev`) get `X-Robots-Tag: noindex` and `<meta name="robots" content="noindex">`.
- **Caching:** the HTML loses the `ETag` of `index.html`, which is the same for every page.
- **Pages with data from D1** (`cv`, `projects/:slug`, `gallery/:slug`, `blog/:slug`): add a `DataPage` to `DATA_PAGES` in `worker/meta/pages.ts` — a pattern on the path after the Lang and a `meta(env, lang, match)` that reads D1 and answers null for an unknown slug (404). It goes before the static meta of the same path. Build the meta with a function in `contracts/meta.ts` (`cvMeta`) and return it as `meta` from the page's loader too: `LangHead` takes it from there. Static sections go in `PAGES` in `contracts/meta.ts`.
- **CV:** the title and description come from the Profile on the Lang (EN when it has none); without a Profile, the section meta. `cv/print` (the Print CV) gets the same meta and `noindex`.
- **Project** (`projects/:slug`, `projectMeta`): the title and description of the Project on the Lang (EN when it has none), its cover through Cloudflare Images at 1200px as `og:image` (`/og-default.png` without one). Without a Case Study, or for an unknown slug, a 404. When D1 fails, the Projects section meta with 200: the page may well be there.
- **Album** (`gallery/:slug`, `albumMeta`): the title of the Album on the Lang (EN when it has none), described as a photo album (`meta.album`), its cover (the chosen photo, else the first) through Cloudflare Images at 1200px as `og:image` (`/og-default.png` without photos). An unknown slug is a 404. When D1 fails, the Gallery section meta with 200.
- **Post** (`blog/:slug`, `postMeta`): the title of the Post on the Lang (EN when it has none), its excerpt as the description (`meta.blog` without one), its cover through Cloudflare Images at 1200px as `og:image`. `og:type=article` with `article:published_time` and `article:modified_time` (`updated_at`). On the Fallback the text is EN, but `og:locale` and canonical stay the page's own. hreflang and `og:locale:alternate` only on the Langs the Post has a Translation on (`x-default` only with EN): a Fallback page would duplicate the EN one. A draft or an unknown slug is a 404; when D1 fails, the Blog section meta with 200.
- **RSS:** the Blog and every Post's page get `<link rel="alternate" type="application/rss+xml">` to the Lang's feed (`blogFeed` in `contracts/meta.ts`), titled as the Blog; `LangHead` renders the same.
- **JSON-LD:** a Post's page gets `<script type="application/ld+json">` with a `BlogPosting` (`blogPosting` in `contracts/meta.ts`): headline, description, image, `datePublished`, `dateModified`, `author` as a `Person` (the Profile's name, linked to the CV; left out without a Profile), `inLanguage` (EN on the Fallback), `url`. `jsonLd` escapes `<` as `\u003c`, so the text can't close the element. A data block is never run, so CSP has nothing to report; `securePage` gives it the nonce like every `<script>` anyway. `LangHead` renders the same one, since Google reads the rendered page. Check with the [Rich Results Test](https://search.google.com/test/rich-results).

## Security headers

`securePage` (`worker/security/headers.ts`) runs on every answer `worker/index.ts` gives outside `/api/*` and `/media/*`, and changes only HTML ones. It is the free stand-in for Page Shield: only scripts the page itself loads can run.

- **Headers:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin` and a `Permissions-Policy` that turns everything off but `autoplay` and `fullscreen` on the site itself (only features Chrome knows, or it warns in the console). HSTS is set on the zone (#41), not here.
- **CSP**, `Content-Security-Policy-Report-Only` for now: it reports and blocks nothing. Stage 6 (Audit in `docs/plan.md`) turns it to `Content-Security-Policy` once the hero, Shiki and the player are in.

  | Directive | Value | Why |
  | --- | --- | --- |
  | `default-src` | `'self'` | Fonts and the manifest included |
  | `script-src` | `'nonce-…' 'strict-dynamic'` | Only scripts with the nonce, and what they load (lazy chunks) |
  | `style-src` | `'self' 'unsafe-inline'` | Radix's scroll lock adds `<style>` without a nonce |
  | `img-src` | `'self'` | `/media/*` and `/cdn-cgi/image/*` are on the same origin |
  | `media-src` | `'self' blob:` | The admin reads an audio file's length from a `blob:` URL |
  | `connect-src` | `'self' https://cloudflareinsights.com` | The Web Analytics beacon reports there |
  | `object-src`, `base-uri` | `'none'` | |
  | `form-action` | `'self'` | |
  | `frame-ancestors` | `'none'` | No framing |
  | `report-uri`, `report-to` | `/api/csp-report`, `csp` | `Reporting-Endpoints: csp="<origin>/api/csp-report"` |

- **Nonce:** 128 random bits, new on every answer. HTMLRewriter puts it on every `<script>` (the theme script, the entry, the beacon) and `<link rel="modulepreload|preload">`, and adds `<meta property="csp-nonce" nonce="…">`, from which Vite's preload helper takes it for the preloads of lazy chunks. Nothing to do in `index.html` or `vite.config.ts`: a new `<script>` there gets it too. A script the app adds at runtime needs no nonce (`'strict-dynamic'`).
- **Caching:** the HTML has no `ETag`, and a navigation (`Accept: text/html`) reaches `ASSETS` without `If-None-Match`/`If-Modified-Since`, so a 304 never pairs an old nonce with a new policy.
- **`/admin`** uses the same policy: same `index.html`, same origin.
- **SRI:** not used. The only third-party script is the Web Analytics beacon, whose `beacon.min.js` Cloudflare updates under the same URL; fonts are self-hosted.
- **`/assets/*`** never runs the Worker: `public/_headers` gives it `nosniff` and `Cache-Control: public, max-age=31536000, immutable` (the names carry a hash).

**Reports:** `POST /api/csp-report` takes both formats, `report-uri` (`application/csp-report`, one violation) and `report-to` (`application/reports+json`, a batch; other report types are skipped), and answers 204. Each violation goes to Workers Logs as `console.warn({ message: "csp-violation", documentUrl, blockedUrl, directive, disposition, sourceFile, line, column, sample })`: filter by `message` in Observability. Bodies up to 64 KB (`MAX_CSP_REPORT_BYTES`), else 413; a body that is not a report answers 400. The rate limit counts it like any read (Rate limits below). The Origin check skips it: browsers send reports from outside the page, and they only reach the logs.

**Check on a Preview:** open every page in every Lang and `/admin` with DevTools open: the console shows no `[Report Only]` messages. Workers Logs of the Preview show no `csp-violation` entries other than from extensions (`blockedUrl` `chrome-extension://…`). Chrome sends `report-to` batches about a minute late; headless Chrome in the e2e tests doesn't send them at all, so `e2e/security.spec.ts` watches the `securitypolicyviolation` event instead.

## API

`/api/*` is routed with [Hono](https://hono.dev): typed routes, and middleware for errors and for the Access check (ADR-0004). Request and response schemas are [Valibot](https://valibot.dev) in `contracts/api/` (smaller bundle than Zod, tree-shaken per function); the frontend and the Worker both import them and get the types with `v.InferOutput`.

- `worker/index.ts` hands `/api/*` to `api` (`worker/api/index.ts`), everything else to `ASSETS`.
- `worker/api/app.ts` — `createApp()`: a Hono app with the error handling below.
- `worker/api/routes/<name>.ts` — one module per endpoint.

**Errors** are always `{ "error": "<code>" }` with the matching status; the codes are `API_ERROR_CODES` in `contracts/api/errors.ts`.

| Status | Code | When |
| --- | --- | --- |
| 400 | `invalid_request` | The input doesn't match the schema, the JSON is malformed, or the Lang is unknown |
| 401 | `unauthorized` | `/api/admin/*` without a valid Access JWT (Admin access below) |
| 403 | `forbidden` | A write (not GET, HEAD, OPTIONS) whose `Origin` is not the API's own (Origin and body limits below) |
| 404 | `not_found` | No route for the path |
| 405 | `method_not_allowed` | The path exists, the method doesn't (`Allow` header lists the methods) |
| 409 | `conflict` | `/api/admin/*`: the row is still in use (an album with photos, a file a row names) or the EN Translation is being removed |
| 413 | `payload_too_large` | A JSON body over 1 MB, a CSP report over 64 KB, or an upload over its limit (Media below) |
| 415 | `unsupported_media_type` | An upload whose bytes are not an allowed type |
| 422 | `validation_failed` | `/api/admin/*` body doesn't match the schema, a unique value (slug, name…) is taken, or an id points at nothing. Also carries `fields`: `{ "<dot path>": ["message"] }` |
| 429 | `too_many_requests` | The IP passed a rate limit (Rate limits below); `Retry-After` gives the seconds to wait |
| 500 | `internal_error` | Unhandled exception; it goes to Workers Logs, the client gets no details |
| 502 | `render_failed` | CV PDF generation: the Print CV didn't get ready or didn't print (CV PDF below) |
| 502 | `translation_failed` | Translation draft: the Claude API failed, or its answer can't be used (Translation draft below) |
| 503 | `browser_unavailable` | CV PDF generation: Browser Rendering gave no browser (CV PDF below) |
| 503 | `translator_unavailable` | Translation draft: no `ANTHROPIC_API_KEY` on the Worker |

**New endpoint:**

1. Schemas in `contracts/api/<name>.ts`.
2. `worker/api/routes/<name>.ts`: a `new Hono<ApiEnv>()` with the handlers, input through `sValidator(target, Schema, rejectInvalid)` (`@hono/standard-validator`), output typed with `satisfies <Response type>`, ending with `.all(path, methodNotAllowed("GET, HEAD"))`. Admin API bodies are `v.strictObject`: an unknown field answers 422, so a typo in a field name isn't silently lost. Public API queries and params are `v.object`: unknown keys are dropped. SQL only through `prepare()` with `?` placeholders and `.bind()`; table and column names in the SQL come from code, never from the request.
3. Mount it in `worker/api/index.ts`: `.route("/<name>", <name>)`. An admin endpoint is a `new Hono<AdminEnv>()` mounted on `admin` there instead, behind the Access check; the email is `c.var.email`. A public one is a `new Hono<PublicEnv>()` in `worker/api/routes/public/`, mounted on `publicApi`; the Lang is `c.var.lang`.
4. Tests next to it (`worker/**/*.test.ts`).

## Rate limits

`rateLimit` (`worker/api/rate-limit.ts`) runs first on every `/api/*` request, unknown paths and `/api/admin/*` before the Access check included. It uses the free [Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) bindings (`ratelimits` in `wrangler.jsonc`) instead of the paid Advanced Rate Limiting rules. Over a limit: 429 `too_many_requests` with `Retry-After: 60`.

| Binding | Requests | Limit | Key |
| --- | --- | --- | --- |
| `API_RATE_LIMIT` | GET, HEAD, OPTIONS anywhere; anything outside `/api/admin/*` | 100 / 60 s | IP + path |
| `ADMIN_WRITE_RATE_LIMIT` | Other methods on `/api/admin/*` | 60 / 60 s | IP |
| `UPLOAD_RATE_LIMIT` | `POST /api/admin/uploads`, `PUT /api/admin/cv-pdf/:lang` | 20 / 60 s | IP |
| `CV_PDF_RATE_LIMIT` | `POST /api/admin/cv-pdf/:lang` (starts a browser) | 6 / 60 s | IP |
| `TRANSLATE_RATE_LIMIT` | `POST /api/admin/translate` (a paid Claude API call) | 10 / 60 s | IP |

- The IP is `CF-Connecting-IP`, which Cloudflare's edge sets on every request. Reads count per path, so the few calls a page makes don't add up; writes per IP, since their paths carry ids.
- Counters are kept per Cloudflare location and the binding allows only 10 or 60 s periods, so the limits are approximate. `RATE_LIMIT_PERIOD` in `rate-limit.ts` must equal `period`: it is the `Retry-After`.
- **Dev and tests:** a request without `CF-Connecting-IP` (Vitest's `exports.default.fetch()`) or to `localhost` (`npm run dev`, e2e) is never limited. `worker/api/rate-limit.test.ts` sets the header and runs against Miniflare's simulation of the bindings.
- `namespace_id` is a number unique within the Cloudflare account; there is nothing to create in the dashboard.

## Origin and body limits

After the rate limit, every `/api/*` request goes through `checkOrigin` (`worker/api/origin.ts`), then `limitBody` (`worker/api/body-limit.ts`).

- **No CORS:** the SPA calls the API from its own origin (ADR-0001), so no answer carries `Access-Control-*` headers, whatever the `Origin` (`https://webrunner.dev` included), and a preflight gets no 204.
- **Cross-site writes:** a request other than GET, HEAD or OPTIONS whose `Origin` is not the API's own origin answers 403 `forbidden`, whatever its `Content-Type`, before the Access check. So a form on another site can't use the owner's Access cookie. A request without `Origin` (curl, tests) passes: browsers always send it with writes. `POST /api/csp-report` passes with any `Origin` (Security headers above).
- **Body size:** `POST /api/admin/uploads` and `PUT /api/admin/cv-pdf/:lang` up to the largest upload limit (its own kind's limit is checked after sniffing, Media below), any other body up to 1 MB (`MAX_JSON_BYTES`). Over it: 413 `payload_too_large`, unread when `Content-Length` says so, cut off mid-stream otherwise.

## Public API

`GET /api/public/:lang/<entity>`, schemas in `contracts/api/public.ts`. The Lang is always the path segment after `public`, like in page URLs; an unknown one answers 400 `invalid_request`. A 200 carries `Cache-Control: public, max-age=60`.

| Path | Answer |
| --- | --- |
| `profile` | The Profile; 404 until it has a Translation |
| `cv-sections?form=web\|print` | `[{type}]` with `show_web` (default) or `show_pdf`, by `position` |
| `cv-pdf` | `{lang, generatedAt, fallback}` of the CV PDF to link: the Lang's own, else EN's (`fallback: true`); 404 while neither exists |
| `experience`, `education`, `languages` | Lists by `position`; experience with its technologies |
| `certifications`, `technologies`, `tracks` | Untranslated lists; technologies by category |
| `projects`, `projects/:slug` | List without `caseStudy` (`hasCaseStudy` instead); by slug with it |
| `posts?tag=<slug>`, `posts/:slug` | Published only, newest first, list without `body`; drafts answer 404. `posts/:slug` adds `body`, `updatedAt` and `langs` (the Langs it has a Translation on) |
| `albums`, `albums/:slug` | List with `photoCount`; by slug with its photos. `cover` (`key`, `width`, `height`) is the chosen photo, else the first one in order (null for an empty album) |

**Fallback** (CONTEXT.md): each translated entity comes with its Translation on the Lang, or its EN one and `fallback: true` when there is none. An entity translated on neither is left out (404 by slug). The SQL is `translationOf()` in `worker/api/public.ts`: one join that picks the Lang's row, else EN, so fields never mix two Translations. A photo's caption is optional: a photo without any caption has `caption: null` and `fallback: false`.

`*Key` fields are R2 object keys; `mediaUrl()`, `imageUrl()` and `imageSrcSet()` from `contracts/media.ts` turn them into URLs (Media below).

## Admin API

`/api/admin/<entity>`, behind the Access check. Schemas in `contracts/api/admin.ts`: each entity has `create`, `patch`, `translation` and `entity` (the answer). Fields are camelCase; booleans are `true`/`false`, bullet lists are arrays.

| Entities | Notes |
| --- | --- |
| `cv-sections`, `technologies`, `certifications`, `tags`, `tracks` | Not translated |
| `experience`, `education`, `languages`, `projects`, `posts`, `albums` | Translated; EN required |
| `photos` | Caption optional, so no Translation is required; `GET ?albumId=` lists one album |
| `profile` | A single record, below |

| Method and path | Answer |
| --- | --- |
| `GET /<entity>` | 200, every row, drafts included: by `position` where there is one, posts newest first |
| `POST /<entity>` | 201 with the row. A translated entity takes `translations: { en: {…}, ru?: {…} }`; new rows go last |
| `GET /<entity>/:id` | 200 with the row and all its Translations |
| `PATCH /<entity>/:id` | 200; any subset of the untranslated fields. Link lists (`technologyIds`, `tagIds`) are replaced whole |
| `DELETE /<entity>/:id` | 204; Translations and links go with it, and its files (Files below). An album with photos answers 409 |
| `PUT /<entity>/:id/translations/:lang` | 200; writes the whole Translation on that Lang |
| `DELETE /<entity>/:id/translations/:lang` | 204; EN answers 409 (except photos) |
| `PUT /<entity>/order` | 204; `{ "ids": [3, 1, 2] }` sets `position` by index, in one batch. Entities with `position`: all but posts and tags. Photos of more than one album answer 422 |

`/profile`: `GET` (404 until created), `PUT` with the `create` body creates it or overwrites its fields, keeping Translations it doesn't mention; `PATCH`, and `/profile/translations/:lang` as above. No delete.

- **Links:** `technologyIds` of experience and projects keep their order; `tagIds` of a post are sorted by id. An unknown id answers 422 on that field.
- **Posts:** publishing without `publishedAt` sets it to now; going back to draft keeps it. `readingMinutes` is counted from `body` whenever a Translation is written (`worker/api/reading-time.ts`: words without markup, code or URLs, 200 a minute, 1 at least); a body that sends it answers 422.
- **Album cover:** `coverKey` is the `r2Key` of one of the album's photos (`PATCH`; any other key answers 422, and `POST` takes none), or null for the first photo. The public API picks the first photo when it answers, so a new order shows at once. Triggers (`migrations/0002`) set it back to null when that photo is deleted, moved to another album or gets another file. The file is the photo's: deleting the album deletes nothing.
- **Files:** deleting a project, post, photo or track deletes the R2 objects its `*Key` fields name (`files` of its `Entity`), after the row and only those no other row names (`worker/api/media-keys.ts`, the same check as `DELETE /uploads/<key>`). A failure in between leaves a file without a row, never the other way round.

The routes come from `crudRoutes()` (`worker/api/admin.ts`) and the SQL from `worker/api/admin-store.ts`, both driven by one `Entity` per table in `worker/api/routes/admin/content.ts` (the Profile in `profile.ts`). A write that touches several tables (a row with its Translations and links) is one `db.batch()`, which D1 runs as a transaction. A new entity: its schemas in `contracts/api/admin.ts`, an `Entity` and a `.route()` in `content.ts`.

## Media

Images, audio and PDFs live in R2 behind the `MEDIA` binding: bucket `webrunner-media` in production, `webrunner-media-preview` for Previews (the `previews` block in `wrangler.jsonc`) and a local one in `.wrangler/` for dev and tests. Types, limits and URL helpers are in `contracts/media.ts`.

**Upload** (`worker/api/routes/admin/uploads.ts`, behind Access):

- `POST /api/admin/uploads` with the file as the raw body (`fetch(url, { method: "POST", body: file })`). The type comes from the file's first bytes (`worker/media/sniff.ts`), never from `Content-Type`: JPEG, PNG, WebP, MP3, M4A, Ogg, PDF. Anything else (SVG, GIF, HEIC…) answers 415; over 20 MB for an image, 50 MB for audio or 10 MB for a PDF, 413.
- 201 `{ key, contentType, size, width, height }` (`UploadResponseSchema`). The key is `<image|audio|pdf>/<uuid>.<ext>`. `width` and `height` are the displayed size of an image (a JPEG turned by EXIF counts as turned), null otherwise; they go into a photo's `width`/`height`.
- `DELETE /api/admin/uploads/<key>`: 204; 404 if there is no such file; 409 while a `*_key` column of any row still names it. Post bodies aren't checked.

**Serving** (`worker/media/serve.ts`): `GET /media/<key>` with the stored `Content-Type`, `ETag` (`If-None-Match` → 304), `X-Content-Type-Options: nosniff` and:

- `Cache-Control: public, max-age=31536000, immutable` when the key holds a uuid (every upload), `public, max-age=60` otherwise (a file rewritten under the same key, like the CV PDF).
- One byte range (`Range: bytes=…`) → 206 with `Content-Range`, so audio can seek; past the end → 416. Several ranges or a malformed header get the whole file (200).
- A missing key → 404, methods other than GET/HEAD → 405, both without a body.

**Resized images** through Cloudflare Images, transformations over `/media/*` on the zone: `imageUrl(key, width)` gives `/cdn-cgi/image/width=<w>,fit=scale-down,format=auto/media/<key>`, `imageSrcSet(key, width)` a `srcset` of the `IMAGE_WIDTHS` below the original plus the original. `/cdn-cgi/image/` exists only on the zone: locally, and on Previews (`workers.dev`), use `mediaUrl(key)`.

One-time setup (owner), **before merging**: the deploy fails while a bucket in `wrangler.jsonc` doesn't exist.

1. `npx wrangler r2 bucket create webrunner-media` and `npx wrangler r2 bucket create webrunner-media-preview`. Nothing else: the buckets stay private, the Worker serves them.
2. Dashboard → `webrunner.dev` zone → **Images** → **Transformations** → **Enable for zone**. The source is the zone itself, so no allowed origins are needed.
3. After the deploy, sign in at `https://webrunner.dev/admin`, then in the DevTools console (Chrome) pick a photo: `const [f] = await showOpenFilePicker(); await (await fetch("/api/admin/uploads", { method: "POST", body: await f.getFile() })).json()`. Open `https://webrunner.dev/media/<key>` from the answer, and `https://webrunner.dev/cdn-cgi/image/width=320,format=auto/media/<key>` for the small copy.

## CV PDF

ADR-0003: one PDF per Lang, printed from the Print CV (`/{lang}/cv/print`, `docs/agents/fsd.md` › Print CV) by [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) (`browser` binding `BROWSER`, `@cloudflare/puppeteer`), or uploaded by hand. Code in `worker/cv-pdf/`, keys and paths in `contracts/cv-pdf.ts`.

- **Storage:** R2 key `cv/<lang>.pdf` (always the same, so a new file replaces the old) and the `cv_pdf` row (`lang`, `r2_key`, `generated_at`). The file is written first, then the row. `DELETE /api/admin/uploads/cv/<lang>.pdf` answers 409 while the row names it.
- **Admin** (behind Access): `GET /api/admin/cv-pdf` → `[{lang, generatedAt}]` of the Langs that have one. `POST /api/admin/cv-pdf/:lang` launches a browser, opens `/{lang}/cv/print` on the request's origin, waits up to 30 s for `html[data-print-ready]`, prints `page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true })` and answers the row. No browser → 503 `browser_unavailable`; the page never ready or the print failing → 502 `render_failed`; both log `{ message: "cv-pdf-render", lang, url, err }`. `PUT /api/admin/cv-pdf/:lang` takes a PDF as the raw body (sniffed like an upload; else 415; over 10 MB 413) and stores it the same way. An unknown Lang → 400.
- **Public:** `GET /{lang}/cv.pdf` (`worker/cv-pdf/serve.ts`, before Meta Injection) serves the file like `/media/*` (ETag, ranges, `nosniff`, `Cache-Control: public, max-age=60`) with `Content-Disposition: inline; filename="webrunner-cv-<lang>.pdf"`; 404 without a body while the Lang has none. A path whose first segment is not a Lang goes to the pages. The Web CV asks `GET /api/public/:lang/cv-pdf` which file to link.
- **Where it works:** webrunner.dev. Previews have no Access (Admin access below), so the admin answers 401 there. Locally Wrangler starts its own Chrome (downloaded on first use), but its `Page.printToPDF` never answers (Wrangler 4.151, Windows), so `POST` ends in 502 after about 30 s: use the manual upload, or check on webrunner.dev.
- **Limits** (Workers Paid, checked 2026-10-20, ADR-0003): 10 browser hours a month, then $0.09 an hour; 10 concurrent browsers; 3 new browsers a second; a browser closes after 60 s idle. `CV_PDF_RATE_LIMIT` (Rate limits above) keeps a stuck button from starting more than 6 a minute.
- **Tests:** `worker/cv-pdf/cv-pdf.test.ts` puts a fake browser in with `vi.spyOn(browsers, "launch")` (`worker/cv-pdf/browser.ts`): `vi.mock` doesn't work in workerd.

**Check after the deploy:** at `https://webrunner.dev/admin/cv-pdf` press **Generate** for EN and RU, then open each `/{lang}/cv.pdf`: one page, the text selects, links click, no phone.

## Translation draft

`POST /api/admin/translate` (`worker/api/routes/admin/translate.ts`, schemas in `contracts/api/translate.ts`) behind the Access check: `{ lang, fields: [{ name, value, markdown? }] }` with the EN values of one form in, `{ fields: { <name>: value } }` in `lang` (any Lang but EN) out. Nothing is saved: the admin's **Translation draft** button fills the form, the owner edits and saves it.

- **Provider:** one Messages API call to Claude (`claude-sonnet-5-5`, `worker/translate/draft.ts`) through `@anthropic-ai/sdk`, chosen for the quality of `kk` and `ar`. Structured outputs give back the same fields, a list (bullets) as a list. Server-side fallbacks (`fallbacks: "default"`) retry a declined request on another model.
- **Markdown:** before the call `protect()` (`worker/translate/markdown.ts`) puts a placeholder `⟦n⟧` in place of each code block, inline code, link target and URL; `restore()` puts them back. A placeholder lost or repeated fails the draft rather than garbling code or links.
- **Names:** the prompt lists the names to keep as written: the Brand, the owner's EN name, every Technology and every EN company of the Experience (`worker/translate/names.ts`, read on each request).
- **Key:** the secret `ANTHROPIC_API_KEY` (`npx wrangler secret put ANTHROPIC_API_KEY`; locally `.dev.vars`). It stays in the Worker. Without it: 503 `translator_unavailable`. An SDK error (auth, limits, network) or an unusable answer (refused, cut off, not the fields asked for, placeholders lost): 502 `translation_failed`, details in Workers Logs (`translate`).
- **Rate limit:** `TRANSLATE_RATE_LIMIT`, 10 a minute per IP (Rate limits above).
- **Tests:** `worker/translate/translate.test.ts` replaces the call with `vi.spyOn(claude, "send")`.

## RSS

`GET /{lang}/rss.xml` (`worker/rss/serve.ts`, before Meta Injection): RSS 2.0 of the Blog on a Lang. A path whose first segment is not a Lang goes to the pages.

- **Items:** the 20 newest published Posts with a Translation of their own on the Lang (`readFeedPosts`), no Fallback: the `kk` feed has no EN copies, the `en` one has every Post. Drafts never.
- **Item:** `title`, `link` and `guid isPermaLink="true"` (the post's absolute URL), `pubDate` (RFC 822, `toUTCString()`), `description` (the excerpt, left out when empty), a `category` per Tag.
- **Channel:** `title` and `description` as the Blog on that Lang (`nav.blog`, `meta.blog`), `link` to `/{lang}/blog`, `language`, `atom:link rel="self"`. URLs use the request's origin.
- **Escaping:** every text goes through `xml()`: `& < > " '` escaped, the C0 control characters XML 1.0 forbids dropped.
- **Headers:** `Content-Type: application/rss+xml; charset=utf-8`, `Cache-Control: public, max-age=60` (as the Public API), `nosniff`; `X-Robots-Tag: noindex` on previews. `HEAD` without a body, other methods 405. D1 failing → 503.
- **Link:** the Blog page links it next to its title (`blog.rss`); its pages announce it in `<head>` (Meta Injection above).

**Check after the deploy:** run `https://webrunner.dev/{lang}/rss.xml` for each Lang through the [W3C Feed Validator](https://validator.w3.org/feed/).

## Tests

`npm test` runs two Vitest projects (`vite.config.ts`): `unit` in Node and `worker`, which runs `worker/**/*.test.ts` in workerd through `@cloudflare/vitest-plugin` with the bindings from `wrangler.jsonc`. D1 is local and every test file starts with the schema from `migrations/` (`worker/test/apply-migrations.ts`). Call the Worker with `exports.default.fetch()` from `cloudflare:workers`, bindings are `env` from the same module. `npx vitest --project worker` runs only these.

`npm run test:e2e` runs Playwright against `vite preview`, for the accessibility checks against `vite preview` over seeded content (`scripts/audit/server.mjs`, `.wrangler/audit`) and, for the Admin editor, against `vite dev` with its own local D1 and R2 in `.wrangler/e2e` and the Access dev bypass (`scripts/e2e-dev.mjs`, `docs/agents/fsd.md` › Admin).

`fsModuleCache` is off for the `worker` project: with Vitest 5 on Windows the cached modules come as OS paths that workerd can't read.

## Admin access

ADR-0004: Cloudflare Access guards `/admin*` (the SPA route, before any asset is served) and `/api/admin/*`. On top of that, `requireAccess` (`worker/api/access.ts`) checks every `/api/admin/*` request, unknown paths included:

- The `Cf-Access-Jwt-Assertion` header must hold a JWT signed by a key of the Access team (`https://<ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs`, cached in memory and refetched on key rotation), with `aud` = `ACCESS_AUD`, `iss` = `https://<ACCESS_TEAM_DOMAIN>` and not expired. Otherwise 401 `unauthorized`.
- `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are `vars` in `wrangler.jsonc`. While either is empty, `/api/admin/*` answers 500 and logs why.
- Tests (`worker/api/access.test.ts`) sign tokens with their own key and serve it in place of the team's key set.

**Local dev:** there is no Access in front of `npm run dev`, so copy `.dev.vars.example` to `.dev.vars` and set `ACCESS_DEV_EMAIL`. Requests then pass as that email, but only when the host is `localhost`, `127.0.0.1` or `[::1]`: the same variable set in production or a Preview opens nothing, and the tests check both. `.dev.vars` is gitignored, and `cf-typegen` reads `.dev.vars.example` instead of it, so a local `.dev.vars` doesn't change `worker-configuration.d.ts`.

**Previews** have no Access in front of them, so `/api/admin/*` answers 401 there: the admin works only on `webrunner.dev` and locally. To try it on a Preview later: Workers & Pages → `webrunner` → **Access** tab → **Protect this Worker behind Access** → scope **Previews only** (not **All traffic**, which would close the public site too), then give Previews that application's AUD through a `vars` block in `previews`.

One-time setup (owner). Menu names as of October 2026; in the Cloudflare dashboard, **Zero Trust** is in the left sidebar.

1. **Zero Trust organization** (skip if Zero Trust already opens without onboarding): choose a team name, then the **Free** plan. Cloudflare asks for payment details even for Free and doesn't charge. The team domain is `<team name>.cloudflareaccess.com`; later it's in Zero Trust → **Settings** → **Team name and domain**.
2. **GitHub OAuth app**: GitHub → Settings → Developer settings → OAuth Apps → **New OAuth app**. Homepage URL `https://<team name>.cloudflareaccess.com`, Authorization callback URL `https://<team name>.cloudflareaccess.com/cdn-cgi/access/callback`. **Register application**, copy the **Client ID**, then **Generate a new client secret** and copy it.
3. **GitHub login**: Zero Trust → **Integrations** → **Identity providers** → **Add new identity provider** → **GitHub**. Paste the Client ID into **App ID** and the secret into **Client secret**, **Save**, **Finish setup**, then authorize when GitHub asks.
4. **Application**: Zero Trust → **Access controls** → **Applications** → **Create new application** → **Self-hosted and private**. **Add public hostname** twice, both with the domain `webrunner.dev`: path `admin`, then path `api/admin`. A path covers everything under it (`/admin/posts`, `/api/admin/me`).
5. **Policy** (on the same screen, under **Access policies**): create one with action **Allow** and the rule Include → **Emails** → the owner's email. Nobody else gets in, since Access denies anything without a matching Allow.
6. **Login methods** (same screen): leave only **GitHub**, then **Create**.
7. **Values for the Worker**: Applications → **Configure** on the new application → **Additional settings** → copy **Application Audience (AUD) Tag** into `ACCESS_AUD` in `wrangler.jsonc`, and `<team name>.cloudflareaccess.com` into `ACCESS_TEAM_DOMAIN`. Run `npm run cf-typegen`, commit and merge.
8. **Check** in a private window: `https://webrunner.dev/admin` leads to the Access login; after it, `https://webrunner.dev/api/admin/me` shows the owner's email.

## Commands

- `npm run dev` — Vite + the Worker in workerd (`@cloudflare/vite-plugin`), one process.
- `npm run preview` — the production build, served the same way.
- `npm run deploy` — build, then `wrangler deploy` (uses the config generated in `dist/`). Normally Workers Builds runs it.
- `npm run db:migrate` — apply D1 migrations to the production database (see D1).
- `npm run db:migrate:preview` — the same for the Preview database.
- `npm run db:seed-cv` — fill D1 with the CV from `docs/private/seed.json`; `-- --remote` for production (`migrations/README.md` › Seeding the CV).
- `npm run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` (reads `.dev.vars.example`, not your `.dev.vars`). CI fails if it is stale.

## Deploy

Workers Builds (Cloudflare Git integration) builds and deploys every push to `main`; other branches get a Preview (`wrangler preview`) at `https://<branch>-webrunner.zhasulan-abdigaliev.workers.dev` (`preview_urls` in `wrangler.jsonc`), and the Cloudflare bot links it in a PR comment. Preview URLs send `X-Robots-Tag: noindex`.

Git hooks (Husky, installed by `npm install`): pre-commit runs `lint-staged.config.js` (ESLint `--fix`, Prettier) on staged files and `gitleaks` with `.gitleaks.toml` (only warns if the binary is missing: `winget install gitleaks` / `brew install gitleaks`); commit-msg runs commitlint; pre-push runs Steiger, typecheck and Vitest. `--no-verify` skips them, so CI below is the real gate.

GitHub Actions never deploys:

- `.github/workflows/ci.yml`, on every PR and push to `main`: `check` (`npm audit`, lint, typecheck, `wrangler types --check`, Prettier, Vitest, Playwright), `gitleaks` (secrets in the pushed commits) and, on PRs, `commitlint` (Conventional Commits; config in `commitlint.config.js`). The `main` ruleset requires `check`, `gitleaks` and `lighthouse`, so only green code reaches production.
- `.github/workflows/lighthouse.yml`, on PRs: `lighthouse` runs Lighthouse CI (mobile, `lighthouserc.json`) on every public page and `/ar`, against the production build served in CI by `scripts/audit/server.mjs` (`vite preview` over a local D1 and R2 filled from `scripts/audit/seed.sql`). Not on the Preview: Previews are behind Access and their D1 is empty; the workflow comment has the reasoning. Blocking: a missed budget (categories ≥ 90, LCP < 2.5 s, initial JS ≤ 150 KB) fails the job and is marked ⚠️ in the job summary; reports are in the `lighthouse` artifact.
- Accessibility: `e2e/a11y.spec.ts` (Playwright project `audit`, against the same server) runs axe (WCAG 2.2 A/AA, contrast included) on every public page in both themes and on `/ar`, and fails on any `serious` or `critical` violation; it also tabs through each page and checks that every stop is on screen and shows a focus ring. It runs in `check` with the other e2e tests.
- `.github/workflows/codeql.yml`, on PRs, pushes to `main` and every Monday: CodeQL (`javascript-typescript`). Findings are in Security › Code scanning; not a required check.

Dependencies:

- `npm audit` in `check` fails on any high or critical advisory (`.github/scripts/npm-audit.mjs`). An advisory with no fix that only reaches build tooling goes into `.github/audit-allowlist.json` with a reason and an `expires` date; past that date CI fails again until someone checks it.
- Dependabot (`.github/dependabot.yml`) opens update PRs every Monday for npm and GitHub Actions: minor and patch bumps grouped into one PR per ecosystem, each major on its own. Security updates come as soon as an alert opens. Alerts are in Security › Dependabot.
- Secret scanning with push protection is on in the repo settings, next to `gitleaks`.

Cloudflare Web Analytics: the beacon is added to `index.html` at build time when `CF_WEB_ANALYTICS_TOKEN` is set (`vite.config.ts`). Only Workers Builds sets it, so dev, CI and e2e builds have no beacon; Preview traffic is reported too, filter by host in the dashboard.

One-time setup (owner):

1. `webrunner.dev` must be a zone in the same Cloudflare account; the `custom_domain` route creates the DNS record and certificate on deploy.
2. Dashboard → Workers & Pages → Create → Import a repository → `WebRunnerDev/portfolio`. Worker name `webrunner` (must match `name` in `wrangler.jsonc`), production branch `main`, build command `npm run build`, deploy command `npm run db:migrate && npx wrangler deploy`, non-production branch deploy command `npx wrangler preview`, build variable `NODE_VERSION=24`.
3. Dashboard → Web Analytics → Add a site → `webrunner.dev`, manual JS snippet setup. Put the token from the snippet into the Worker's build variable `CF_WEB_ANALYTICS_TOKEN`.
4. After the deploy, check `https://webrunner.dev/en/cv` and `https://webrunner.dev/api/health`.
5. D1 (before merging the first migration): `npx wrangler d1 create webrunner` and `npx wrangler d1 create webrunner-preview`. In `wrangler.jsonc`, put the `webrunner` ID into `database_id` of `d1_databases`, and the `webrunner-preview` ID into `preview_database_id` there and into `database_id` of `previews.d1_databases`. Then `npm run db:migrate:preview`; production migrates on the next deploy.

## D1

The `DB` binding (ADR-0002) points at two databases: `webrunner` for production and `webrunner-preview` for Previews (the `previews` block in `wrangler.jsonc`), so a Preview never touches production data. Schema and conventions: `migrations/README.md`.

- Production: the deploy command runs `npm run db:migrate` (`wrangler d1 migrations apply DB --remote`) before `wrangler deploy`. A failed migration stops the deploy.
- Preview: not migrated automatically, since all branches share one Preview database. After merging a migration (or to try one from a branch), run `npm run db:migrate:preview` (`--remote --preview`, through `preview_database_id`).
- Local: `npm run dev` uses a local D1 in `.wrangler/`; `npx wrangler d1 migrations apply DB --local` fills it.
