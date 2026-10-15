# 0009. Фронтенд на Feature-Sliced Design, роутинг — тонкий слой в `app`

- Статус: принято
- Дата: 2026-10-15

## Контекст
Каркас (#3) создан по умолчаниям shadcn: `src/components`, `src/lib`, `src/routes`. Владелец работает по Feature-Sliced Design (FSD), а проект вырастет до публичной части и админки на шести языках. Миграция дешёвая, пока в `src/` около десятка файлов, — до i18n, тем и лейаута (#5–#9).

## Решение
- `src/` раскладывается по слоям FSD 2.1: `app` → `pages` → `widgets` → `features` → `entities` → `shared`. Подход **pages first**: код живёт в `pages/<slice>` и выносится ниже только при повторном использовании.
- File-based роутинг TanStack Router остаётся, но маршруты — тонкие файлы в `src/app/routes/` (`createFileRoute`, loader, `component` из `@/pages/<slice>`); `routeTree.gen.ts` — в `src/app/`.
- shadcn ставит компоненты в `src/shared/ui/kit/` (алиасы `components.json`), свои UI-примитивы — в `src/shared/ui/<name>/`; `cn` и хуки — в `src/shared/lib/`; провайдеры — в `src/app/providers/`.
- Имена `entities/*` совпадают с терминами [CONTEXT.md](../../CONTEXT.md) (`project`, `post`, `album`, `photo`, `track`, `technology`, `profile`…).
- Границы проверяет **Steiger** (официальный линтер FSD) в `npm run lint` → в CI (#10) и pre-push (#12).
- Worker (`worker/`) не следует FSD. Общий код фронта и Worker (список Lang, схемы и типы API) — в корневой папке `contracts/`, которую импортируют обе стороны; Worker не импортирует из `src/`.

## Альтернативы
- Оставить структуру shadcn по умолчанию — не масштабируется на админку и шесть разделов, расходится с привычным владельцу подходом.
- Маршруты кодом вместо file-based — теряется автоматический code-splitting и типизация путей.
- Общие контракты в `src/shared` — Worker завязался бы на внутренности фронтенда.
- `eslint-plugin-boundaries` вместо Steiger — правила FSD пришлось бы описывать вручную.

## Последствия
- Исключение из правила `no-restricted-classes` ([ADR-0008](0008-logical-inset-classes.md)) переезжает с `src/components/ui/**` на `src/shared/ui/kit/**` — так оно не задевает собственные компоненты.
- Админка — слайсы `pages/admin-*`; lazy-загрузка сохраняется за счёт code-splitting маршрутов.
