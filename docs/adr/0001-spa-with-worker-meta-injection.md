# 0001. SPA + инъекция мета-тегов на Worker вместо SSR

- Статус: принято
- Дата: 2026-10-14

## Контекст
Сайт — SPA на React + TanStack Router. Нужны корректные превью при шаринге постов в LinkedIn (краулер не исполняет JS) и приемлемое SEO для блога и CV. Музыкальный плеер должен играть без перерыва при переходах между страницами.

## Решение
Оставляем SPA. Один Cloudflare Worker раздаёт статику через **Workers Static Assets** (вместо Pages) и обслуживает API. Для HTML-запросов Worker через **HTMLRewriter** подставляет в `index.html` `<title>`, description, OG-теги и hreflang по маршруту (данные берёт из D1).

## Альтернативы
- Чистое SPA — нет превью постов, слабое SEO.
- TanStack Start (SSR) — полноценно, но сложнее и тяжелее для анимационного сайта.
- Cloudflare Pages вместо Workers Static Assets — Cloudflare рекомендует Workers для новых проектов; на Pages API и meta injection ушли бы в Pages Functions, а Cron Triggers (отложенные задачи) там недоступны. Цена выбора Workers — preview-деплои на PR настраиваются в GitHub Actions вручную.

## Последствия
- Превью и базовое SEO работают без SSR; плеер не прерывается.
- Фронт и API на одном origin — без CORS.
- Контент страницы краулеры без JS не видят — только мета-теги.
