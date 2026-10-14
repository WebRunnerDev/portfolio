# 0006. Hero с тремя уровнями и заменяемым эффектом

- Статус: принято
- Дата: 2026-10-14

## Контекст
Hero — «дерзкая» анимация из OriginKit (вероятно WebGL/canvas), но сайт должен быть плавным на слабом железе. Конкретный эффект может меняться.

## Решение
Компонент `<Hero tier="full|lite|static">` скрывает конкретный эффект за интерфейсом.
- `full` — эффект OriginKit, lazy-load, пауза вне вьюпорта (IntersectionObserver), DPR ≤ 1.5.
- `lite` — CSS/SVG-анимация ромбов логотипа.
- `static` — картинка.

Выбор tier: `prefers-reduced-motion` → static; `hardwareConcurrency ≤ 4`, `deviceMemory ≤ 4`, `saveData` → lite; иначе full с FPS-пробой 2 с (< 40 FPS → lite).

## Последствия
- Эффект заменяется без правок остальной страницы.
- Тяжёлый код не входит в initial JS-бюджет.
