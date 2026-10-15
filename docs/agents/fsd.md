# Feature-Sliced Design

Frontend `src/` follows FSD 2.1 ([ADR-0009](../adr/0009-feature-sliced-design.md)). `npm run lint` runs Steiger, which enforces the boundaries.

## Where code goes

- **Pages first.** New code lives in `src/pages/<slice>/` (`ui/`, `model/`, `lib/`…). Move it down to `widgets`, `features`, `entities` or `shared` only when a second slice needs it. Create a layer only when it gets its first slice.
- **Routes are thin.** `src/app/routes/` holds TanStack Router files: `createFileRoute`, loader, `component` from `@/pages/<slice>`. Inside a page, read route data with `getRouteApi("<route id>")`.
- **Entities** are named after [CONTEXT.md](../../CONTEXT.md) terms (`project`, `post`, `album`…).
- **Providers** go in `src/app/providers/`. A hook pages need (e.g. `useTheme`) and its context go in `src/shared/lib/<name>/`; the provider imports the context from there.
- **shadcn** components land in `src/shared/ui/kit/` via `npx shadcn add`. Add each new one to `src/shared/ui/kit/index.ts` and import from `@/shared/ui/kit` (`kit.test.ts` checks this). Own UI primitives go in `src/shared/ui/<name>/` with an `index.ts`.
- **kit vs native tags.** Use kit for controls and overlays (button, input, dialog, menu, tabs…), never a hand-rolled `<div onClick>`. Text, headings, lists, links and landmarks (`section`, `nav`, `article`) stay native tags with Tailwind; don't wrap them. Radix-backed overlays not visible on first paint load lazily.
- **Imports** between slices go through the slice's `index.ts` only.

## Shared with the Worker

`contracts/` (repo root, alias `@contracts/*`) holds what both the frontend and `worker/` use: the Lang list, API schemas and types. The Worker imports from `contracts/`, never from `src/`.

## RTL

`ar` is RTL ([ADR-0007](../adr/0007-rtl-from-day-one.md)). `DirectionProvider` in the `/$lang` route sets `<html dir>` and Radix's direction from `langDirection(lang)` in `contracts/lang.ts`.

- **Layout** mirrors by itself with logical classes (`ms-`, `ps-`, `inset-s-`). Don't read `dir` for layout.
- **JS motion:** `const { dir, flipX } = useDirection()` from `@/shared/lib/direction`. Pass Motion `x`, swipe deltas and drag bounds through `flipX`.
- **Portals** (menu, popover, tooltip, dialog) render under `<body>` and inherit `<html dir>`. Don't put `dir` on page wrappers and expect portals to follow.
- **Never mirrored:** logo, hero, player, code blocks. Put `dir="ltr"` on their wrapper element (an `<svg>` can't take `dir`).
- **Direction icons** (arrows, chevrons pointing along the reading direction) get `rtl:rotate-180`.

## Theme

`ThemeProvider` (`src/app/providers/`) puts `light` or `dark` on `<html>`; the inline script in `index.html` does it first, before paint. Both read the `theme` key in `localStorage` — change it in `src/shared/lib/theme/theme-storage.ts` and `index.html` together.

- **Colors** only through tokens (`zsd-*`, shadcn semantic classes). They switch with the `.dark` class; no hex in components.
- **Storage** through `readTheme` / `writeTheme`: they survive blocked `localStorage`.
- **Switcher:** `ThemeSwitcher` from `@/features/theme-switcher`.

## Layout

The `/$lang` route renders the layout: `SiteHeader` (`@/widgets/header`), `<main id="main">`, `SiteFooter` (`@/widgets/footer`). The menu (`@/widgets/menu`) goes into the header through its `menu` slot, because widgets can't import each other.

- **Sections:** `SECTIONS` in `src/shared/config/sections.ts` feeds the menu links and the current section in the header. A new section = a page slice, a route file, an entry there and a `nav.*` key in every dictionary.
- **Contacts** live in the footer (`src/widgets/footer/model/contacts.ts`), not on a page of their own. No phone anywhere.
- **404:** an unknown path under a Lang renders `NotFoundPage` (`notFoundComponent` of `/$lang`) inside the layout.
- **Page transitions:** `defaultViewTransition` in `src/main.tsx`; the animation is in `src/index.css`, instant under reduced motion.
- **360px:** below `lg` the Lang and theme switchers live in the menu, not the header. `e2e/layout.spec.ts` checks every page in every Lang for horizontal scroll.
