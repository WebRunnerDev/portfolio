# worker/

Cloudflare Worker (ADR-0001): serves the SPA through Workers Static Assets and owns `/api/*`. Meta Injection lands later. Config lives in `wrangler.jsonc` at the repo root.

Code shared with the frontend (Lang list, API schemas and types) lives in `contracts/`, imported as `@contracts/*` (mapped in `tsconfig.worker.json`); never import from `src/`.

- Static assets are served without invoking the Worker; unknown paths fall back to `index.html` (`not_found_handling: "single-page-application"`), so deep links like `/en/cv` work.
- Only `/api/*` runs the Worker first. `GET /api/health` → `{"status":"ok"}`; any other `/api/*` → JSON 404.

## Commands

- `npm run dev` — Vite + the Worker in workerd (`@cloudflare/vite-plugin`), one process.
- `npm run preview` — the production build, served the same way.
- `npm run deploy` — build, then `wrangler deploy` (uses the config generated in `dist/`).
- `npm run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc`.

## First deploy (owner)

1. `npx wrangler login`.
2. `webrunner.dev` must be a zone in the same Cloudflare account; the `custom_domain` route creates the DNS record and certificate on deploy.
3. `npm run deploy`, then check `https://webrunner.dev/en/cv` and `https://webrunner.dev/api/health`.
