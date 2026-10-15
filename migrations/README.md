# migrations/

D1 schema migrations (`wrangler d1 migrations`) for the `DB` binding: all content lives in D1 (ADR-0002). The data model is in `docs/plan.md` › Модель данных.

## Conventions

- Translatable fields go to `<entity>_translation` with PK `(<entity>_id, lang)` and `CHECK (lang IN (...))` listing `LANGS` from `contracts/lang.ts`. Adding a Lang means a migration that rebuilds every table with `lang` (SQLite can't change a `CHECK`); `migrations.test.ts` fails until the lists match.
- Translations and link tables (`project_technology`, `experience_technology`, `post_tag`) are `ON DELETE CASCADE`. `photo` is not: an album with photos can't be deleted, the API removes photos with their R2 objects first.
- Tables are `STRICT`. Booleans are `INTEGER` 0/1, timestamps ISO 8601 UTC text, month dates `YYYY-MM`, `*_key` columns R2 keys, `position` sorts ascending, lists are JSON arrays.
- No phone anywhere (CONTEXT.md › Profile).

## Workflow

- New migration: `npx wrangler d1 migrations create DB <name>`, then write the SQL. Never edit a migration that reached production; add a new one.
- Local database (used by `npm run dev`): `npx wrangler d1 migrations apply DB --local`.
- `npm test` runs `migrations.test.ts`: applies every migration to a clean local D1 and checks the schema. CI runs it.
- Production: `npm run db:migrate` (`scripts/d1-migrate.mjs`), part of the Workers Builds production deploy command.
- Preview database: `npm run db:migrate:preview`, by hand (worker/README.md › D1).
