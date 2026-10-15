-- Initial content schema (ADR-0002, docs/plan.md › Модель данных).
--
-- Conventions:
-- - Translatable fields live in `<entity>_translation` with PK (<entity>_id, lang).
--   `lang` is checked against LANGS from contracts/lang.ts; migrations.test.ts
--   fails if the lists drift apart.
-- - Translations and link tables cascade on delete. Rows that point at R2
--   objects (photo) do not: the API deletes them one by one with their files.
-- - Booleans are INTEGER 0/1; timestamps are ISO 8601 UTC text; month dates
--   are 'YYYY-MM'; `*_key` columns are R2 object keys.
-- - `position` orders rows in lists, ascending.
-- - No phone anywhere (CONTEXT.md › Profile).

-- Profile: a single row (id = 1).
CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  email TEXT,
  telegram_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  photo_key TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE profile_translation (
  profile_id INTEGER NOT NULL REFERENCES profile (id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ru', 'kk', 'es', 'de', 'ar')),
  name TEXT NOT NULL,
  headline TEXT NOT NULL,
  about TEXT,
  location TEXT,
  PRIMARY KEY (profile_id, lang)
) STRICT;

-- CV Section: one row per section type.
CREATE TABLE cv_section (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL UNIQUE CHECK (
    type IN (
      'experience',
      'projects',
      'technologies',
      'education',
      'certifications',
      'languages'
    )
  ),
  position INTEGER NOT NULL DEFAULT 0,
  show_web INTEGER NOT NULL DEFAULT 1 CHECK (show_web IN (0, 1)),
  show_pdf INTEGER NOT NULL DEFAULT 1 CHECK (show_pdf IN (0, 1))
) STRICT;

-- Technology: the shared directory used by CV, projects and experience.
CREATE TABLE technology (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (
    category IN ('frontend', 'backend_cloud', 'qa_testing', 'tools_design')
  ),
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE INDEX technology_category_position ON technology (category, position);

-- Experience. `end_month` NULL means "present".
CREATE TABLE experience (
  id INTEGER PRIMARY KEY,
  company_url TEXT,
  start_month TEXT NOT NULL,
  end_month TEXT,
  position INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE INDEX experience_position ON experience (position);

CREATE TABLE experience_translation (
  experience_id INTEGER NOT NULL REFERENCES experience (id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ru', 'kk', 'es', 'de', 'ar')),
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT,
  -- JSON array of strings.
  bullets TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(bullets) AND json_type(bullets) = 'array'
  ),
  PRIMARY KEY (experience_id, lang)
) STRICT;

CREATE TABLE experience_technology (
  experience_id INTEGER NOT NULL REFERENCES experience (id) ON DELETE CASCADE,
  technology_id INTEGER NOT NULL REFERENCES technology (id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (experience_id, technology_id)
) STRICT;

CREATE INDEX experience_technology_technology ON experience_technology (technology_id);

-- Education. `gpa` is free text ("3.6 / 4.0").
CREATE TABLE education (
  id INTEGER PRIMARY KEY,
  start_month TEXT NOT NULL,
  end_month TEXT,
  gpa TEXT,
  position INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE INDEX education_position ON education (position);

CREATE TABLE education_translation (
  education_id INTEGER NOT NULL REFERENCES education (id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ru', 'kk', 'es', 'de', 'ar')),
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  -- Diploma or thesis line, if any.
  diploma TEXT,
  PRIMARY KEY (education_id, lang)
) STRICT;

-- Certification: not translated.
CREATE TABLE certification (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issued_month TEXT,
  credential_url TEXT,
  position INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE INDEX certification_position ON certification (position);

-- Language skill. `code` is the ISO 639-1 code of the spoken language.
CREATE TABLE language_skill (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE INDEX language_skill_position ON language_skill (position);

CREATE TABLE language_skill_translation (
  language_skill_id INTEGER NOT NULL REFERENCES language_skill (id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ru', 'kk', 'es', 'de', 'ar')),
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  PRIMARY KEY (language_skill_id, lang)
) STRICT;

-- Project. `status` is the card badge; `featured` shows it on the home page.
CREATE TABLE project (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (
    status IN ('in_progress', 'completed', 'archived')
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

CREATE INDEX project_position ON project (position);
CREATE INDEX project_featured_position ON project (featured, position);
CREATE INDEX project_in_cv_position ON project (in_cv, position);

CREATE TABLE project_translation (
  project_id INTEGER NOT NULL REFERENCES project (id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ru', 'kk', 'es', 'de', 'ar')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  -- JSON array of strings.
  cv_bullets TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(cv_bullets) AND json_type(cv_bullets) = 'array'
  ),
  -- Markdown. NULL: no /projects/:slug page.
  case_study TEXT,
  PRIMARY KEY (project_id, lang)
) STRICT;

CREATE TABLE project_technology (
  project_id INTEGER NOT NULL REFERENCES project (id) ON DELETE CASCADE,
  technology_id INTEGER NOT NULL REFERENCES technology (id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, technology_id)
) STRICT;

CREATE INDEX project_technology_technology ON project_technology (technology_id);

-- Post. `published_at` is set when the status becomes 'published'.
CREATE TABLE post (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  cover_key TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (status = 'draft' OR published_at IS NOT NULL)
) STRICT;

CREATE INDEX post_status_published_at ON post (status, published_at DESC);

CREATE TABLE post_translation (
  post_id INTEGER NOT NULL REFERENCES post (id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ru', 'kk', 'es', 'de', 'ar')),
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  -- Markdown.
  body TEXT NOT NULL DEFAULT '',
  reading_minutes INTEGER NOT NULL DEFAULT 1 CHECK (reading_minutes >= 0),
  PRIMARY KEY (post_id, lang)
) STRICT;

CREATE TABLE tag (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
) STRICT;

CREATE TABLE post_tag (
  post_id INTEGER NOT NULL REFERENCES post (id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
) STRICT;

CREATE INDEX post_tag_tag ON post_tag (tag_id);

-- Album. Deleting one with photos fails: remove the photos (and their R2
-- objects) first.
CREATE TABLE album (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  cover_key TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX album_position ON album (position);

CREATE TABLE album_translation (
  album_id INTEGER NOT NULL REFERENCES album (id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ru', 'kk', 'es', 'de', 'ar')),
  title TEXT NOT NULL,
  PRIMARY KEY (album_id, lang)
) STRICT;

CREATE TABLE photo (
  id INTEGER PRIMARY KEY,
  album_id INTEGER NOT NULL REFERENCES album (id),
  r2_key TEXT NOT NULL UNIQUE,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX photo_album_position ON photo (album_id, position);

-- Caption is optional: no row, no caption.
CREATE TABLE photo_translation (
  photo_id INTEGER NOT NULL REFERENCES photo (id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ru', 'kk', 'es', 'de', 'ar')),
  caption TEXT NOT NULL,
  PRIMARY KEY (photo_id, lang)
) STRICT;

-- Track: not translated. `source` and `license` record where it came from.
CREATE TABLE track (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  source TEXT NOT NULL,
  license TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  position INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE INDEX track_position ON track (position);

-- CV PDF: the latest generated file per Lang.
CREATE TABLE cv_pdf (
  lang TEXT NOT NULL PRIMARY KEY CHECK (lang IN ('en', 'ru', 'kk', 'es', 'de', 'ar')),
  r2_key TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;
