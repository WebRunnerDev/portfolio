-- A fifth Technology category, `ai` (AI-Assisted Development), as in the CV.
-- SQLite can't change a CHECK, so the table is rebuilt. Dropping it would
-- cascade to the link tables, so their rows are kept aside and put back.
PRAGMA defer_foreign_keys = true;

CREATE TABLE technology_new (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (
    category IN ('frontend', 'qa_testing', 'ai', 'backend_cloud', 'tools_design')
  ),
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0
) STRICT;

INSERT INTO technology_new (id, name, category, icon, position)
SELECT id, name, category, icon, position FROM technology;

CREATE TABLE project_technology_keep AS SELECT * FROM project_technology;
CREATE TABLE experience_technology_keep AS SELECT * FROM experience_technology;

DROP TABLE technology;
ALTER TABLE technology_new RENAME TO technology;
CREATE INDEX technology_category_position ON technology (category, position);

INSERT INTO project_technology SELECT * FROM project_technology_keep;
INSERT INTO experience_technology SELECT * FROM experience_technology_keep;
DROP TABLE project_technology_keep;
DROP TABLE experience_technology_keep;
