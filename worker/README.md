# worker/

Cloudflare Worker: static assets, `/api/*`, Meta Injection. Set up in #4.

Code shared with the frontend (Lang list, API schemas and types) lives in `contracts/`. Map `@contracts/*` → `../contracts/*` in the Worker's tsconfig; never import from `src/`.
