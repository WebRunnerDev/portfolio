# worker/

Cloudflare Worker (ADR-0001): serves the SPA through Workers Static Assets and owns `/api/*`. Meta Injection lands later. Config lives in `wrangler.jsonc` at the repo root.

Code shared with the frontend (Lang list, API schemas and types) lives in `contracts/`, imported as `@contracts/*` (mapped in `tsconfig.worker.json`); never import from `src/`.

- Static assets are served without invoking the Worker; unknown paths fall back to `index.html` (`not_found_handling: "single-page-application"`), so deep links like `/en/cv` work.
- Only `/api/*` runs the Worker first. `GET /api/health` → `{"status":"ok"}`; any other `/api/*` → JSON 404.

## Commands

- `npm run dev` — Vite + the Worker in workerd (`@cloudflare/vite-plugin`), one process.
- `npm run preview` — the production build, served the same way.
- `npm run deploy` — build, then `wrangler deploy` (uses the config generated in `dist/`). Normally CI runs it.
- `npm run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc`. CI fails if it is stale.

## Deploy

`.github/workflows/ci.yml` runs lint, typecheck, unit and e2e tests on every PR and push to `main`. A green push to `main` then deploys to production.

One-time setup (owner):

1. `webrunner.dev` must be a zone in the same Cloudflare account; the `custom_domain` route creates the DNS record and certificate on deploy.
2. Create an API token from the "Edit Cloudflare Workers" template, scoped to this account and the `webrunner.dev` zone. If the first CI deploy can't attach the custom domain, add Zone → DNS → Edit, or run the first deploy locally (`npx wrangler login`, `npm run deploy`).
3. In GitHub, add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (Settings → Secrets and variables → Actions). The deploy job uses the `production` environment, which GitHub creates on first run; add protection rules there if wanted.
4. After the deploy, check `https://webrunner.dev/en/cv` and `https://webrunner.dev/api/health`.
