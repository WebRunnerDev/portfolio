# migrations/

D1 schema migrations (`wrangler d1 migrations`). First ones land in stage 2.

`npm run db:migrate` (`scripts/d1-migrate.mjs`) applies them to the remote `DB` database; the Workers Builds production deploy command runs it before `wrangler deploy`. With no `.sql` files here it does nothing.
