-- A fourth Project status, `maintained`: finished and live, still looked
-- after (CONTEXT.md › Project). SQLite can't change a CHECK, so the table is
-- rebuilt. Dropping it would cascade to its Translations and Technology
-- links, so their rows are kept aside and put back (as in 0003).
PRAGMA defer_foreign_keys = true;

CREATE TABLE project_new (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (
    status IN ('in_progress', 'maintained', 'completed', 'archived')
  ),
  cover_key TEXT,
  github_url TEXT,
  demo_url TEXT,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  in_cv INTEGER NOT NULL DEFAULT 0 CHECK (in_cv IN (0, 1)),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

INSERT INTO project_new (
  id, slug, status, cover_key, github_url, demo_url, featured, in_cv,
  position, created_at, updated_at
)
SELECT
  id, slug, status, cover_key, github_url, demo_url, featured, in_cv,
  position, created_at, updated_at
FROM project;

CREATE TABLE project_translation_keep AS SELECT * FROM project_translation;
CREATE TABLE project_technology_keep AS SELECT * FROM project_technology;

DROP TABLE project;
ALTER TABLE project_new RENAME TO project;
CREATE INDEX project_position ON project (position);
CREATE INDEX project_featured_position ON project (featured, position);
CREATE INDEX project_in_cv_position ON project (in_cv, position);

INSERT INTO project_translation SELECT * FROM project_translation_keep;
INSERT INTO project_technology SELECT * FROM project_technology_keep;
DROP TABLE project_translation_keep;
DROP TABLE project_technology_keep;
