# Детальный план: портфолио WebRunner (webrunner.dev)

Основа — [start_plan.md](start_plan.md); решения и их обоснование — [журнал grilling-сессии](grilling/2026-10-14-detailed-plan.md); термины — [CONTEXT.md](../CONTEXT.md); архитектурные решения — [adr/](adr/).

## Архитектура в одном абзаце

Одно React-SPA (Vite + TanStack Router + Tailwind + shadcn/ui) раздаётся одним Cloudflare Worker через **Workers Static Assets**. Тот же Worker обслуживает `/api/*` (Hono, схемы Valibot в `contracts/`), читает/пишет **D1** (весь контент) и **R2** (медиа, музыка, PDF), а для HTML-запросов инжектит `<title>`/OG/hreflang через HTMLRewriter. Админка — lazy-маршрут `/admin` того же SPA, закрытый **Cloudflare Access**. PDF резюме генерирует **Browser Rendering**. Картинки ресайзятся через **Cloudflare Images**.

```
webrunner.dev ── Worker ─┬─ static assets (SPA)
                         ├─ HTMLRewriter: meta/OG/hreflang по маршруту
                         ├─ /api/public/*  → D1, R2
                         ├─ /api/admin/*   → Access JWT → D1, R2, Browser Rendering
                         └─ /{lang}/cv.pdf, /media/*, /{lang}/rss.xml
```

## Сквозные требования

- **Языки:** `en` (fallback), `ru`, `kk`, `es`, `de`, `ar` (MSA). URL с префиксом языка; `/` → редирект по `Accept-Language`; выбор — в cookie; hreflang.
- **RTL ([ADR-0007](adr/0007-rtl-from-day-one.md)):** с первого дня. `<html dir>` + Radix `DirectionProvider` из одного состояния Lang; только логические Tailwind-классы (линтер `enforce-logical-properties`); `x`/свайпы в Motion инвертируются через хук направления. Не зеркалятся: лого, hero, плеер, блоки кода. Цифры в `ar` — западные (`ar-u-nu-latn`).
- **Архитектура фронтенда ([ADR-0009](adr/0009-feature-sliced-design.md)):** Feature-Sliced Design 2.1, pages first; маршруты TanStack — тонкие файлы в `src/app/routes/`; shadcn — в `src/shared/ui/kit/`; границы проверяет Steiger. Общий код фронта и Worker — в корневой `contracts/`.
- **Темы:** системная по умолчанию + переключатель; без мигания (тема ставится инлайн-скриптом до рендера).
- **Анимации:** Motion + View Transitions; всё уважает `prefers-reduced-motion`.
- **Перф-бюджет:** Lighthouse mobile ≥ 90 (все категории), initial JS ≤ 150 KB gzip без hero-эффекта, LCP < 2.5 с на 4G.
- **Доступность:** клавиатура везде, видимый фокус, контраст AA.
- **Шрифты:** обязательна казахская кириллица и латиница с диакритикой; для `ar` — отдельный арабский шрифт (кандидат Readex Pro), грузится только на `/ar/` через `unicode-range`.
- **Личные данные:** исходники CV в `docs/private/` (gitignored); телефон нигде публично не показывается — ни на сайте, ни в PDF.

## Модель данных (D1, черновик)

Переводимые поля вынесены в `*_translation (entity_id, lang, …)`.

| Таблица | Ключевые поля |
|---|---|
| `profile` + `profile_translation` | имя, заголовок, о себе, локация, контакты, фото (R2) |
| `cv_section` | тип (experience/projects/technologies/education/certifications/languages), порядок, `show_web`, `show_pdf` |
| `experience` + `_translation` | компания, роль, даты, пункты |
| `education` + `_translation` | вуз, степень, даты, GPA, диплом |
| `certification` | название, издатель, дата, ссылка на credential |
| `language_skill` + `_translation` | язык, уровень |
| `technology` | имя, группа (Front-End / Back-End & Cloud / QA & Testing / Tools & Design), иконка |
| `project` + `_translation` | slug, статус, обложка, ссылки GitHub/демо, `featured`, `in_cv`, описание, `cv_bullets`, `case_study` (Markdown, опц.) |
| `project_technology`, `experience_technology` | связи со справочником |
| `post` + `post_translation` | slug, статус (draft/published), даты, обложка; заголовок, excerpt, body (Markdown), время чтения |
| `tag`, `post_tag` | теги постов |
| `album` + `_translation` | slug, обложка, порядок; название |
| `photo` + `_translation` | R2-ключ, размеры, порядок, альбом; подпись (опц.) |
| `track` | название, автор, источник/лицензия, R2-ключ, длительность, порядок |
| `cv_pdf` | lang, R2-ключ, сгенерирован в |

## Этапы

### Этап 1 — Каркас и дизайн-основа
**Задачи**
1. Дизайн-бриф и `DESIGN.md`: `define-design` → `define-color-system` (палитра «графит + ржавчина» с исправлениями из Q27) → `define-typography` (шрифты с казахской кириллицей) → `define-interaction-states`, `define-responsive-layout`. Экспорт токенов в Tailwind (`export-design-tokens`). Арабский шрифт подбирается здесь же.
2. Лого: `fill` → `currentColor`; favicon / apple-touch-icon / OG-заглушка из лого.
3. Проект: Vite + React + TS, TanStack Router (file-based), Tailwind, shadcn/ui в RTL-режиме (`shadcn create --template vite --rtl`, стиль `*-nova`), ESLint/Prettier + `eslint-plugin-better-tailwindcss` (`enforce-logical-properties`). Проверить, генерирует ли shadcn устаревшие в Tailwind 4.2 `start-*`/`end-*`.
3.1. Миграция каркаса на FSD (#16): слои `app`/`pages`/`widgets`/`features`/`entities`/`shared`, маршруты в `src/app/routes/`, алиасы shadcn → `shared/ui/kit`, Steiger в `lint`, папка `contracts/`.
4. Worker со static assets (`wrangler.jsonc`), SPA-fallback, привязка к `webrunner.dev`.
5. i18n: словари UI на 6 языков (`ar` — пока заглушка из EN), `/$lang/...`-маршруты, редирект с `/`, cookie, hreflang, переключатель.
6. RTL: `dir` на `<html>` + `DirectionProvider` по Lang, хук `useDirection` для Motion, `dir` на portalled-контенте; smoke-тест: каркас на `/ar/` зеркален, лого и код — нет.
7. Темы: инлайн-скрипт без мигания, переключатель.
8. Лейаут: компактный хедер, полноэкранное меню (пока без «ромбовой» анимации), футер; страницы-заглушки: главная, CV, проекты, галерея, блог.
9. Контакты в футере на всех страницах: почта (`mailto:` + копирование), Telegram, LinkedIn, GitHub; статичные данные пока. Отдельной страницы контактов нет.
10. CI: GitHub Actions — lint, typecheck, Vitest, Playwright smoke; preview на PR, прод на `main`. CF Web Analytics.
11. Git-хуки (#12): Husky + lint-staged. pre-commit — ESLint/Prettier по застейдженным файлам и gitleaks (без бинарника — предупреждение); commit-msg — commitlint; pre-push — Steiger, typecheck, Vitest. Обходятся `--no-verify`, поэтому главная защита — CI.

**Готово, когда:** webrunner.dev открывает каркас на 6 языках в обеих темах, `/ar/` корректно зеркален; навигация и переходы работают; CI зелёный и деплоит preview/прод.

### Этап 2 — Бэкенд и каркас админки
**Задачи**
1. Схема D1 и миграции (таблица выше); миграции применяются в CI.
2. R2-бакет; отдача медиа через Worker; Cloudflare Images для превью.
3. API: `/api/public/*` (чтение с учётом языка и fallback), `/api/admin/*` (CRUD).
4. Cloudflare Access на `/admin*`, `/api/admin/*`; проверка JWT в Worker; локальный dev-обход.
5. Админка: lazy `/admin`, лейаут, список сущностей, общий редактор переводов (табы языков), загрузка файлов в R2.
6. HTMLRewriter: meta/OG/hreflang по маршруту (базовые значения).

**Готово, когда:** из админки за Access можно создать/изменить запись любой сущности и загрузить файл; публичный API отдаёт данные с fallback на EN; Vitest покрывает API.

### Этап 3 — CV и проекты
**Задачи**
1. Seed-скрипт из `docs/private/` в D1: предпочтительно LaTeX-исходник из Overleaf (`.tex`), иначе EN/RU PDF. Имя: RU/KK — «Жасулан Абдигалиев», EN/ES/DE — Zhasulan Abdigaliyev.
2. Админка: профиль, разделы CV (порядок, `show_web`/`show_pdf`), опыт, образование, сертификаты, языки, справочник технологий, проекты.
3. Веб-CV: дизайнерская версия. Шапка CV (имя, заголовок, контакты из Profile, без телефона) — в обеих формах CV.
4. Печатная версия `/{lang}/cv/print`: A4, одна страница, print-CSS.
5. Генерация PDF через Browser Rendering по кнопке → R2 → `/{lang}/cv.pdf`; кнопка «Скачать PDF» на веб-CV.
6. Проекты: сетка карточек, бейдж статуса, страница `/projects/:slug` при наличии case study (Markdown).

**Готово, когда:** CV на 5 языках (KK/ES/DE — хотя бы черновики; AR — на этапе 6) в вебе и PDF совпадают по содержанию; PDF выделяемый, со ссылками, на одной странице.

### Этап 4 — Галерея
**Задачи**
1. Админка: альбомы, мультизагрузка фото, сортировка, подписи по языкам.
2. Публичная часть: список альбомов, masonry, lazy-loading, адаптивные `srcset` через Images.
3. Лайтбокс: полноэкранный, свайпы (инвертируются в RTL), клавиатура, предзагрузка соседних.

**Готово, когда:** альбом из 50+ фото грузится быстро на мобиле (LCP в бюджете), лайтбокс доступен с клавиатуры.

### Этап 5 — Блог
**Задачи**
1. Админка: Markdown-редактор с live-превью, drag-n-drop картинок в R2, теги, черновики, переводы.
2. Рендер Markdown + Shiki; время чтения.
3. Список постов с тегами; страница поста; плашка «доступно на EN» при fallback.
4. OG-инъекция для `/{lang}/blog/:slug` (заголовок, описание, обложка).
5. RSS по языку; sitemap.
6. Кнопка «Поделиться в LinkedIn» (share-offsite ссылка).

**Готово, когда:** опубликованный пост даёт корректное превью в LinkedIn Post Inspector; RSS валиден.

### Этап 6 — Hero, музыка, полировка
**Задачи**
1. Hero: эффект из OriginKit за интерфейсом `<Hero tier>`; детекция tier (reduced-motion, cores, memory, saveData, FPS-проба); lite — анимация ромбов лого; static — картинка.
2. Главная: секции-баннеры (обо мне, избранные проекты, последние посты, галерея); контакты — в футере.
3. Полноэкранное меню с анимацией раскладки ромбов; ромбовый лоадер.
4. Музыкальный плеер: треки из D1/R2, панель, запоминание громкости/трека, CSS-визуализатор; админка треков (с полем лицензии).
5. Микроанимации кнопок/карточек/баннеров; View Transitions между страницами.
6. Кнопка «Черновик перевода» в админке (Workers AI / Claude API).
7. Арабский: черновой перевод UI, Profile и CV → разовая вычитка носителем (фриланс, ~1 ч), написание имени на арабском — от носителя; RTL-аудит всех страниц, CV PDF на `ar`, ручная проверка Calendar/Pagination/Sidebar и hero в RTL.
8. Аудит: Lighthouse CI (блокирующий), доступность, проверка на слабом устройстве.

**Готово, когда:** перф-бюджет соблюдён на всех страницах; `/ar/` полностью переведён (кроме постов — EN-fallback) и вычитан; при reduced-motion анимации отключены; плеер переживает переходы между страницами.

## Открытые вопросы

- Написание имени на арабском и вычитка `ar` (носитель, этап 6).
- LaTeX-исходник CV из Overleaf для seed (желательно, этап 3).
- Выбор конкретного hero-эффекта (заменяемый, решается на этапе 6).
- Лицензии на музыку (пока Pixabay Music).
- Какие пет-проекты показывать (сейчас: PlotOps, AITU AMS).
- Сайты-референсы.
