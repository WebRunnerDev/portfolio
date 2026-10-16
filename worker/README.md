# worker/

Cloudflare Worker (ADR-0001): serves the SPA through Workers Static Assets and owns `/api/*`. Meta Injection lands later. Config lives in `wrangler.jsonc` at the repo root.

Code shared with the frontend (Lang list, API schemas and types) lives in `contracts/`, imported as `@contracts/*` (mapped in `tsconfig.worker.json`); never import from `src/`.

- Static assets are served without invoking the Worker; unknown paths fall back to `index.html` (`not_found_handling: "single-page-application"`), so deep links like `/en/cv` work.
- Only `/api/*` and `/media/*` run the Worker first; `/api/*` goes to the API below, `/media/*` to the MEDIA bucket (Media below). `GET /api/health` → `{"status":"ok"}`.
- `/api/public/:lang/*` reads published content on a Lang (Public API below).
- `/api/admin/*` needs a Cloudflare Access sign-in (Admin access below). `GET /api/admin/me` → `{"email":"…"}` of the signed-in owner; the rest is CRUD of the content (Admin API below).

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
| 404 | `not_found` | No route for the path |
| 405 | `method_not_allowed` | The path exists, the method doesn't (`Allow` header lists the methods) |
| 409 | `conflict` | `/api/admin/*`: the row is still in use (an album with photos, a file a row names) or the EN Translation is being removed |
| 413 | `payload_too_large` | An upload over its limit (Media below) |
| 415 | `unsupported_media_type` | An upload whose bytes are not an allowed type |
| 422 | `validation_failed` | `/api/admin/*` body doesn't match the schema, a unique value (slug, name…) is taken, or an id points at nothing. Also carries `fields`: `{ "<dot path>": ["message"] }` |
| 500 | `internal_error` | Unhandled exception; it goes to Workers Logs, the client gets no details |

**New endpoint:**

1. Schemas in `contracts/api/<name>.ts`.
2. `worker/api/routes/<name>.ts`: a `new Hono<ApiEnv>()` with the handlers, input through `sValidator(target, Schema, rejectInvalid)` (`@hono/standard-validator`), output typed with `satisfies <Response type>`, ending with `.all(path, methodNotAllowed("GET, HEAD"))`.
3. Mount it in `worker/api/index.ts`: `.route("/<name>", <name>)`. An admin endpoint is a `new Hono<AdminEnv>()` mounted on `admin` there instead, behind the Access check; the email is `c.var.email`. A public one is a `new Hono<PublicEnv>()` in `worker/api/routes/public/`, mounted on `publicApi`; the Lang is `c.var.lang`.
4. Tests next to it (`worker/**/*.test.ts`).

## Public API

`GET /api/public/:lang/<entity>`, schemas in `contracts/api/public.ts`. The Lang is always the path segment after `public`, like in page URLs; an unknown one answers 400 `invalid_request`. A 200 carries `Cache-Control: public, max-age=60`.

| Path | Answer |
| --- | --- |
| `profile` | The Profile; 404 until it has a Translation |
| `cv-sections` | `[{type}]` with `show_web`, by `position` |
| `experience`, `education`, `languages` | Lists by `position`; experience with its technologies |
| `certifications`, `technologies`, `tracks` | Untranslated lists; technologies by category |
| `projects`, `projects/:slug` | List without `caseStudy` (`hasCaseStudy` instead); by slug with it |
| `posts?tag=<slug>`, `posts/:slug` | Published only, newest first, list without `body`; drafts answer 404 |
| `albums`, `albums/:slug` | List; by slug with its photos |

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
| `DELETE /<entity>/:id` | 204; Translations and links go with it |
| `PUT /<entity>/:id/translations/:lang` | 200; writes the whole Translation on that Lang |
| `DELETE /<entity>/:id/translations/:lang` | 204; EN answers 409 (except photos) |
| `PUT /<entity>/order` | 204; `{ "ids": [3, 1, 2] }` sets `position` by index. Entities with `position`: all but posts and tags |

`/profile`: `GET` (404 until created), `PUT` with the `create` body creates it or overwrites its fields, keeping Translations it doesn't mention; `PATCH`, and `/profile/translations/:lang` as above. No delete.

- **Links:** `technologyIds` of experience and projects keep their order; `tagIds` of a post are sorted by id. An unknown id answers 422 on that field.
- **Posts:** publishing without `publishedAt` sets it to now; going back to draft keeps it.
- **Photos and tracks:** deleting one leaves its file in R2; delete it with `DELETE /uploads/<key>` (Media below).

The routes come from `crudRoutes()` (`worker/api/admin.ts`) and the SQL from `worker/api/admin-store.ts`, both driven by one `Entity` per table in `worker/api/routes/admin/content.ts` (the Profile in `profile.ts`). A write that touches several tables (a row with its Translations and links) is one `db.batch()`, which D1 runs as a transaction. A new entity: its schemas in `contracts/api/admin.ts`, an `Entity` and a `.route()` in `content.ts`.

## Media

Images, audio and PDFs live in R2 behind the `MEDIA` binding: bucket `webrunner-media` in production, `webrunner-media-preview` for Previews (the `previews` block in `wrangler.jsonc`) and a local one in `.wrangler/` for dev and tests. Types, limits and URL helpers are in `contracts/media.ts`.

**Upload** (`worker/api/routes/admin/uploads.ts`, behind Access):

- `POST /api/admin/uploads` with the file as the raw body (`fetch(url, { method: "POST", body: file })`). The type comes from the file's first bytes (`worker/media/sniff.ts`), never from `Content-Type`: JPEG, PNG, WebP, MP3, M4A, Ogg, PDF. Anything else (SVG, GIF, HEIC…) answers 415; over 20 MB for an image, 50 MB for audio or 10 MB for a PDF, 413.
- 201 `{ key, contentType, size, width, height }` (`UploadResponseSchema`). The key is `<image|audio|pdf>/<uuid>.<ext>`. `width` and `height` are the displayed size of an image (a JPEG turned by EXIF counts as turned), null otherwise; they go into a photo's `width`/`height`.
- `DELETE /api/admin/uploads/<key>`: 204; 404 if there is no such file; 409 while a `*_key` column of any row still names it. Post bodies aren't checked.

**Serving** (`worker/media/serve.ts`): `GET /media/<key>` with the stored `Content-Type`, `ETag` (`If-None-Match` → 304), `X-Content-Type-Options: nosniff` and:

- `Cache-Control: public, max-age=31536000, immutable` when the key holds a uuid (every upload), `public, max-age=60` otherwise (a file rewritten under the same key, like a future CV PDF).
- One byte range (`Range: bytes=…`) → 206 with `Content-Range`, so audio can seek; past the end → 416. Several ranges or a malformed header get the whole file (200).
- A missing key → 404, methods other than GET/HEAD → 405, both without a body.

**Resized images** through Cloudflare Images, transformations over `/media/*` on the zone: `imageUrl(key, width)` gives `/cdn-cgi/image/width=<w>,fit=scale-down,format=auto/media/<key>`, `imageSrcSet(key, width)` a `srcset` of the `IMAGE_WIDTHS` below the original plus the original. `/cdn-cgi/image/` exists only on the zone: locally, and on Previews (`workers.dev`), use `mediaUrl(key)`.

One-time setup (owner), **before merging**: the deploy fails while a bucket in `wrangler.jsonc` doesn't exist.

1. `npx wrangler r2 bucket create webrunner-media` and `npx wrangler r2 bucket create webrunner-media-preview`. Nothing else: the buckets stay private, the Worker serves them.
2. Dashboard → `webrunner.dev` zone → **Images** → **Transformations** → **Enable for zone**. The source is the zone itself, so no allowed origins are needed.
3. After the deploy, sign in at `https://webrunner.dev/admin`, then in the DevTools console (Chrome) pick a photo: `const [f] = await showOpenFilePicker(); await (await fetch("/api/admin/uploads", { method: "POST", body: await f.getFile() })).json()`. Open `https://webrunner.dev/media/<key>` from the answer, and `https://webrunner.dev/cdn-cgi/image/width=320,format=auto/media/<key>` for the small copy.

## Tests

`npm test` runs two Vitest projects (`vite.config.ts`): `unit` in Node and `worker`, which runs `worker/**/*.test.ts` in workerd through `@cloudflare/vitest-plugin` with the bindings from `wrangler.jsonc`. D1 is local and every test file starts with the schema from `migrations/` (`worker/test/apply-migrations.ts`). Call the Worker with `exports.default.fetch()` from `cloudflare:workers`, bindings are `env` from the same module. `npx vitest --project worker` runs only these.

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
- `npm run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` (reads `.dev.vars.example`, not your `.dev.vars`). CI fails if it is stale.

## Deploy

Workers Builds (Cloudflare Git integration) builds and deploys every push to `main`; other branches get a Preview (`wrangler preview`) at `https://<branch>-webrunner.zhasulan-abdigaliev.workers.dev` (`preview_urls` in `wrangler.jsonc`), and the Cloudflare bot links it in a PR comment. Preview URLs send `X-Robots-Tag: noindex`.

Git hooks (Husky, installed by `npm install`): pre-commit runs `lint-staged.config.js` (ESLint `--fix`, Prettier) on staged files and `gitleaks` with `.gitleaks.toml` (only warns if the binary is missing: `winget install gitleaks` / `brew install gitleaks`); commit-msg runs commitlint; pre-push runs Steiger, typecheck and Vitest. `--no-verify` skips them, so CI below is the real gate.

GitHub Actions never deploys:

- `.github/workflows/ci.yml`, on every PR and push to `main`: `check` (lint, typecheck, `wrangler types --check`, Prettier, Vitest, Playwright), `gitleaks` (secrets in the pushed commits) and, on PRs, `commitlint` (Conventional Commits; config in `commitlint.config.js`). The `main` ruleset requires `check` and `gitleaks`, so only green code reaches production.
- `.github/workflows/lighthouse.yml`, on PRs: waits for the `Workers Builds: webrunner` check, then runs Lighthouse CI (mobile, `lighthouserc.json`) on `/en` and `/en/cv` of the Preview. Warning only: budgets (categories ≥ 90, LCP < 2.5 s, initial JS ≤ 150 KB) show up as ⚠️ in the job summary, reports are in the `lighthouse` artifact.

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
