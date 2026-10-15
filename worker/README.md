# worker/

Cloudflare Worker (ADR-0001): serves the SPA through Workers Static Assets and owns `/api/*`. Meta Injection lands later. Config lives in `wrangler.jsonc` at the repo root.

Code shared with the frontend (Lang list, API schemas and types) lives in `contracts/`, imported as `@contracts/*` (mapped in `tsconfig.worker.json`); never import from `src/`.

- Static assets are served without invoking the Worker; unknown paths fall back to `index.html` (`not_found_handling: "single-page-application"`), so deep links like `/en/cv` work.
- Only `/api/*` runs the Worker first; it goes to the API below. `GET /api/health` → `{"status":"ok"}`.

## API

`/api/*` is routed with [Hono](https://hono.dev): typed routes, and middleware for errors now and for the Access check later (ADR-0004). Request and response schemas are [Valibot](https://valibot.dev) in `contracts/api/` (smaller bundle than Zod, tree-shaken per function); the frontend and the Worker both import them and get the types with `v.InferOutput`.

- `worker/index.ts` hands `/api/*` to `api` (`worker/api/index.ts`), everything else to `ASSETS`.
- `worker/api/app.ts` — `createApp()`: a Hono app with the error handling below.
- `worker/api/routes/<name>.ts` — one module per endpoint.

**Errors** are always `{ "error": "<code>" }` with the matching status; the codes are `API_ERROR_CODES` in `contracts/api/errors.ts`.

| Status | Code | When |
| --- | --- | --- |
| 400 | `invalid_request` | The input doesn't match the schema, or the JSON is malformed |
| 404 | `not_found` | No route for the path |
| 405 | `method_not_allowed` | The path exists, the method doesn't (`Allow` header lists the methods) |
| 500 | `internal_error` | Unhandled exception; it goes to Workers Logs, the client gets no details |

**New endpoint:**

1. Schemas in `contracts/api/<name>.ts`.
2. `worker/api/routes/<name>.ts`: a `new Hono<ApiEnv>()` with the handlers, input through `sValidator(target, Schema, rejectInvalid)` (`@hono/standard-validator`), output typed with `satisfies <Response type>`, ending with `.all(path, methodNotAllowed("GET, HEAD"))`.
3. Mount it in `worker/api/index.ts`: `.route("/<name>", <name>)`.
4. Tests next to it (`worker/**/*.test.ts`).

## Tests

`npm test` runs two Vitest projects (`vite.config.ts`): `unit` in Node and `worker`, which runs `worker/**/*.test.ts` in workerd through `@cloudflare/vitest-plugin` with the bindings from `wrangler.jsonc`. D1 is local and every test file starts with the schema from `migrations/` (`worker/test/apply-migrations.ts`). Call the Worker with `exports.default.fetch()` from `cloudflare:workers`, bindings are `env` from the same module. `npx vitest --project worker` runs only these.

`fsModuleCache` is off for the `worker` project: with Vitest 5 on Windows the cached modules come as OS paths that workerd can't read.

## Commands

- `npm run dev` — Vite + the Worker in workerd (`@cloudflare/vite-plugin`), one process.
- `npm run preview` — the production build, served the same way.
- `npm run deploy` — build, then `wrangler deploy` (uses the config generated in `dist/`). Normally Workers Builds runs it.
- `npm run db:migrate` — apply D1 migrations to the production database (see D1).
- `npm run db:migrate:preview` — the same for the Preview database.
- `npm run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc`. CI fails if it is stale.

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
