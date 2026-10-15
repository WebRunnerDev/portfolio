# 0008. `inset-s-*`/`inset-e-*` в своём коде, сгенерированный shadcn не трогаем

- Статус: принято
- Дата: 2026-10-15

## Контекст
В Tailwind 4.2 классы `start-*`/`end-*` объявлены устаревшими в пользу `inset-s-*`/`inset-e-*`. Проверка на shadcn 4.21 (`--rtl`, стиль `radix-nova`, Tailwind 4.3.3): RTL-версии компонентов по-прежнему генерируют `start-*`/`end-*` — около 40 вхождений в 25 компонентах (`dialog`, `sheet`, `select`, `dropdown-menu`, `sidebar` и др.). Tailwind 4.3 их ещё компилирует, CSS идентичный (`inset-inline-start`/`inset-inline-end`). `no-deprecated-classes` из `eslint-plugin-better-tailwindcss` 4.9 об этой депрекации не знает.

## Решение
- В своём коде `start-*`/`end-*` запрещены правилом `better-tailwindcss/no-restricted-classes` с автофиксом в `inset-s-*`/`inset-e-*`.
- `src/components/ui/**` (вывод `shadcn add`) из этого правила исключён: компоненты не правим руками, чтобы обновления через `shadcn add` давали чистый diff. `enforce-logical-properties` действует и там.
- `enforce-logical-properties` настроен только на горизонтальную ось: `w-`/`h-`/`size-`, `top-`/`bottom-`, `mt-`/`mb-`/`pt-`/`pb-`, `border-t`/`border-b` игнорируются — они важны лишь для вертикальных режимов письма, которых у нас нет.

## Альтернативы
- Запретить везде и прогонять `eslint --fix` после каждого `shadcn add` — постоянный шум в diff сгенерированных файлов.
- Ничего не запрещать — устаревшие классы расползутся по своему коду и сломаются при их удалении из Tailwind.

## Последствия
- Когда Tailwind удалит `start-*`/`end-*`, а shadcn не успеет обновиться, — один раз `eslint --fix` по `src/components/ui/**` с включённым правилом.
- При обновлении shadcn стоит перепроверить, не перешёл ли он на `inset-s-*`, и снять исключение.
