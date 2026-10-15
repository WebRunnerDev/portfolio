# worker/

Cloudflare Worker (ADR-0001): serves the SPA through Workers Static Assets and owns `/api/*`. Meta Injection lands later. Config lives in `wrangler.jsonc` at the repo root.

Code shared with the frontend (Lang list, API schemas and types) lives in `contracts/`, imported as `@contracts/*` (mapped in `tsconfig.worker.json`); never import from `src/`.

- Static assets are served without invoking the Worker; unknown paths fall back to `index.html` (`not_found_handling: "single-page-application"`), so deep links like `/en/cv` work.
- Only `/api/*` runs the Worker first. `GET /api/health` → `{"status":"ok"}`; any other `/api/*` → JSON 404.

## Commands

- `npm run dev` — Vite + the Worker in workerd (`@cloudflare/vite-plugin`), one process.
- `npm run preview` — the production build, served the same way.
- `npm run deploy` — build, then `wrangler deploy` (uses the config generated in `dist/`). Normally Workers Builds runs it.
- `npm run db:migrate` — apply D1 migrations to the remote database (see Deploy).
- `npm run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc`. CI fails if it is stale.

## Deploy

Workers Builds (Cloudflare Git integration) builds and deploys every push to `main`; other branches get a Preview (`wrangler preview`) at `https://<branch>-webrunner.zhasulan-abdigaliev.workers.dev` (`preview_urls` in `wrangler.jsonc`), and the Cloudflare bot links it in a PR comment. Preview URLs send `X-Robots-Tag: noindex`.

Git hooks (Husky, installed by `npm install`): pre-commit runs `lint-staged.config.js` (ESLint `--fix`, Prettier) on staged files and `gitleaks` with `.gitleaks.toml` (only warns if the binary is missing: `winget install gitleaks` / `brew install gitleaks`); commit-msg runs commitlint; pre-push runs Steiger, typecheck and Vitest. `--no-verify` skips them, so CI below is the real gate.

GitHub Actions never deploys:

- `.github/workflows/ci.yml`, on every PR and push to `main`: `check` (lint, typecheck, `wrangler types --check`, Prettier, Vitest, Playwright), `gitleaks` (secrets in the pushed commits) and, on PRs, `commitlint` (Conventional Commits; config in `commitlint.config.js`). The `main` ruleset requires `check` and `gitleaks`, so only green code reaches production.
- `.github/workflows/lighthouse.yml`, on PRs: waits for the `Workers Builds: webrunner` check, then runs Lighthouse CI (mobile, `lighthouserc.json`) on `/en` and `/en/cv` of the Preview. Warning only: budgets (categories ≥ 90, LCP < 2.5 s, initial JS ≤ 150 KB) show up as ⚠️ in the job summary, reports are in the `lighthouse` artifact.

D1 migrations: `npm run db:migrate` applies `migrations/*.sql` to the remote `DB` database and skips when there are none, so the production deploy command already runs it. Previews never migrate; in stage 2 bind them to a separate D1 in the `previews` block.

Cloudflare Web Analytics: the beacon is added to `index.html` at build time when `CF_WEB_ANALYTICS_TOKEN` is set (`vite.config.ts`). Only Workers Builds sets it, so dev, CI and e2e builds have no beacon; Preview traffic is reported too, filter by host in the dashboard.

One-time setup (owner):

1. `webrunner.dev` must be a zone in the same Cloudflare account; the `custom_domain` route creates the DNS record and certificate on deploy.
2. Dashboard → Workers & Pages → Create → Import a repository → `WebRunnerDev/portfolio`. Worker name `webrunner` (must match `name` in `wrangler.jsonc`), production branch `main`, build command `npm run build`, deploy command `npm run db:migrate && npx wrangler deploy`, non-production branch deploy command `npx wrangler preview`, build variable `NODE_VERSION=24`.
3. Dashboard → Web Analytics → Add a site → `webrunner.dev`, manual JS snippet setup. Put the token from the snippet into the Worker's build variable `CF_WEB_ANALYTICS_TOKEN`.
4. After the deploy, check `https://webrunner.dev/en/cv` and `https://webrunner.dev/api/health`.
