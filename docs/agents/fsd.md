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
