-- Content for the audit server (scripts/audit/server.mjs): one of everything
-- the public pages show, in EN and AR, so Lighthouse and axe see full pages.
-- The photo file is public/og-default.png, put into the local R2 as
-- image/audit.png.

INSERT INTO profile (id, email, telegram_url, linkedin_url, github_url)
VALUES (1, 'hello@example.com', 'https://t.me/example',
  'https://www.linkedin.com/in/example', 'https://github.com/example');

INSERT INTO profile_translation (profile_id, lang, name, headline, about, location)
VALUES
  (1, 'en', 'Zhasulan Abdigaliyev', 'Frontend developer',
    'I build fast, accessible web apps on the edge.', 'Astana, Kazakhstan'),
  (1, 'ar', 'جاسولان عبديغالييف', 'مطوّر واجهات أمامية',
    'أبني تطبيقات ويب سريعة وسهلة الوصول.', 'أستانا، كازاخستان');

INSERT INTO cv_section (type, position) VALUES
  ('experience', 0), ('projects', 1), ('technologies', 2),
  ('education', 3), ('certifications', 4), ('languages', 5);

INSERT INTO technology (id, name, category, position) VALUES
  (1, 'TypeScript', 'frontend', 0),
  (2, 'React', 'frontend', 1),
  (3, 'Cloudflare Workers', 'backend_cloud', 0),
  (4, 'Playwright', 'qa_testing', 0),
  (5, 'Figma', 'tools_design', 0);

INSERT INTO experience (id, company_url, start_month, end_month, position)
VALUES (1, 'https://example.com', '2024-01', NULL, 0);

INSERT INTO experience_translation (experience_id, lang, company, role, location, bullets)
VALUES
  (1, 'en', 'Acme', 'Frontend developer', 'Remote',
    '["Shipped the design system", "Cut the initial JS by half"]'),
  (1, 'ar', 'أكمي', 'مطوّر واجهات أمامية', 'عن بُعد',
    '["أطلقت نظام التصميم", "خفّضت حجم JavaScript الأولي إلى النصف"]');

INSERT INTO experience_technology (experience_id, technology_id, position)
VALUES (1, 1, 0), (1, 2, 1);

INSERT INTO education (id, start_month, end_month, gpa, position)
VALUES (1, '2019-09', '2023-06', '3.6 / 4.0', 0);

INSERT INTO education_translation (education_id, lang, institution, degree, diploma)
VALUES
  (1, 'en', 'Nazarbayev University', 'BSc in Computer Science', NULL),
  (1, 'ar', 'جامعة نزارباييف', 'بكالوريوس علوم الحاسوب', NULL);

INSERT INTO certification (id, name, issuer, issued_month, credential_url, position)
VALUES (1, 'Web Accessibility', 'W3C', '2025-03', 'https://example.com/cert', 0);

INSERT INTO language_skill (id, code, position) VALUES (1, 'en', 0), (2, 'ru', 1);

INSERT INTO language_skill_translation (language_skill_id, lang, name, level)
VALUES
  (1, 'en', 'English', 'C1'),
  (2, 'en', 'Russian', 'Native'),
  (1, 'ar', 'الإنجليزية', 'C1'),
  (2, 'ar', 'الروسية', 'اللغة الأم');

INSERT INTO project (id, slug, status, cover_key, github_url, demo_url, featured, in_cv, position)
VALUES
  (1, 'edge-portfolio', 'completed', 'image/audit.png',
    'https://github.com/example/portfolio', 'https://example.com', 1, 1, 0),
  (2, 'tracker', 'in_progress', NULL, 'https://github.com/example/tracker',
    NULL, 1, 1, 1);

INSERT INTO project_translation (project_id, lang, title, description, cv_bullets, case_study)
VALUES
  (1, 'en', 'Edge portfolio', 'A portfolio served by one Worker.',
    '["One Worker for the app and the API"]',
    '## Problem

A portfolio in six languages that stays fast.

## Solution

One Worker serves the app, the API and the meta tags.

```ts
export default { fetch: app.fetch }
```'),
  (2, 'en', 'Tracker', 'A Git-native issue tracker.', '[]', NULL),
  (1, 'ar', 'موقع على الحافة', 'موقع شخصي يخدمه Worker واحد.', '[]',
    '## المشكلة

موقع بست لغات يبقى سريعًا.'),
  (2, 'ar', 'متتبّع', 'متتبّع مهام مبني على Git.', '[]', NULL);

INSERT INTO project_technology (project_id, technology_id, position)
VALUES (1, 1, 0), (1, 3, 1), (2, 2, 0);

INSERT INTO post (id, slug, status, cover_key, published_at)
VALUES
  (1, 'edge-caching', 'published', 'image/audit.png', '2026-10-20T12:00:00.000Z'),
  (2, 'rtl-tests', 'published', NULL, '2026-09-03T12:00:00.000Z');

INSERT INTO post_translation (post_id, lang, title, excerpt, body, reading_minutes)
VALUES
  (1, 'en', 'Edge caching', 'What a Worker keeps and for how long.',
    'A Worker can cache **public** responses.

## Headers

- `Cache-Control: public, max-age=60`
- `Vary: Accept-Language`

```ts
return new Response(body, { headers })
```

> Cache what is the same for everyone.', 2),
  (2, 'en', 'RTL tests', 'The mirror in e2e.', 'Logical properties first.', 1),
  (1, 'ar', 'التخزين المؤقت على الحافة', 'ما يحفظه Worker وإلى متى.',
    'يمكن لـ Worker تخزين الاستجابات **العامة**.', 2),
  (2, 'ar', 'اختبارات RTL', 'المرآة في e2e.', 'الخصائص المنطقية أولًا.', 1);

INSERT INTO tag (id, slug, name) VALUES
  (1, 'cloudflare', 'Cloudflare'), (2, 'testing', 'Testing');

INSERT INTO post_tag (post_id, tag_id) VALUES (1, 1), (2, 2);

INSERT INTO album (id, slug, cover_key, position) VALUES (1, 'astana', NULL, 0);

INSERT INTO album_translation (album_id, lang, title)
VALUES (1, 'en', 'Astana'), (1, 'ar', 'أستانا');

INSERT INTO photo (id, album_id, r2_key, width, height, position)
VALUES (1, 1, 'image/audit.png', 1200, 630, 0);

INSERT INTO photo_translation (photo_id, lang, caption)
VALUES (1, 'en', 'The logo on a dark field'), (1, 'ar', 'الشعار على خلفية داكنة');
