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

## Seeding the CV

`npm run db:seed-cv` (`scripts/seed-cv.mjs`) fills D1 with the CV from `docs/private/seed.json`: Profile, CV Sections, Technologies, Experience, Education, Certifications, Language Skills and Projects with their Translations and Technology links. It is a one-time start: after it, D1 and the Admin are the source of truth.

- `seed.json` is gitignored (personal data). Its structure, with made-up data, is `docs/private/seed.example.json`. It is the Admin API `create` bodies (`contracts/api/admin.ts`) with three changes: links name Technologies (`"technologies": ["React"]`) instead of ids, R2 keys (`photoKey`, `coverKey`) and the case study are left for the Admin, and lists are in display order. The script checks the file against those schemas before touching D1: an unknown field (a phone) fails.
- Target: `--local` by default (the D1 of `npm run dev`), `-- --remote` for production, `-- --remote --preview` for the Preview database, `-- --persist-to <dir>` for another local state.
- `scripts/seed-cv/build.ts` turns the file into SQL; `wrangler d1 execute --file` runs it. Locally that is one batch, a transaction. Remotely it is a D1 import; if it stops halfway, run it again.

Idempotency: running it again changes nothing.

- Rows with a natural key are upserted by it: the Profile (`id` 1), `cv_section.type`, `technology.name`, `language_skill.code`, `project.slug`, and Translations by `(<entity>_id, lang)`. Rows and Translations missing from `seed.json` stay, as do the fields it leaves out (covers, case studies). An update skips rows whose values are the same, so `updated_at` moves only on a real change.
- Experience, Education and Certification have no natural key: the seed deletes them all and inserts its own, so their Admin edits (other Langs included) are lost on a rerun.
- The Technology links of the seeded Experience and Projects are replaced with the ones in `seed.json`.
