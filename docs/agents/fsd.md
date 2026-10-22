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

`contracts/` (repo root, alias `@contracts/*`) holds what both the frontend and `worker/` use: the Lang list, the UI dictionaries (`contracts/messages/`, read through `@/shared/i18n`), page meta, API schemas and types. The Worker imports from `contracts/`, never from `src/`.

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

- **Sections:** `SECTIONS` in `src/shared/config/sections.ts` feeds the menu links and the current section in the header. A new section = a page slice, a route file, an entry there, an entry in `PAGES` (`contracts/meta.ts`, for its title and description) and `nav.*` + `meta.*` keys in every dictionary.
- **Contacts** live in the footer (`src/widgets/footer/model/contacts.ts`), not on a page of their own. No phone anywhere.
- **Head tags:** `LangHead` renders the title, description, canonical and hreflang of the page from `contracts/meta.ts`, the same values the Worker injects for crawlers (`worker/README.md` › Meta Injection). A page whose meta comes from D1 returns it as `meta` from its loader (`loadCv` → `cvMeta`), and `LangHead` takes it over the static one. Pages don't render their own `<title>`; NotFoundPage is the exception.
- **CSP** (`worker/README.md` › Security headers): the Worker puts a nonce on every `<script>` in `index.html`; scripts the app loads need none. No inline handlers (`onclick="…"`), `javascript:` URLs, `eval`, `data:` images or third-party origins: each is a violation. A new origin goes into the policy in `worker/security/headers.ts`.
- **404:** an unknown path under a Lang renders `NotFoundPage` (`notFoundComponent` of `/$lang`) inside the layout.
- **Page transitions:** `defaultViewTransition` in `src/main.tsx`; the animation is in `src/index.css`, instant under reduced motion.
- **Scroll:** `scrollRestoration` in `src/main.tsx`: Back returns to where the page was scrolled. A navigation that only changes the search (the Lightbox) passes `resetScroll: false`.
- **360px:** below `lg` the Lang and theme switchers live in the menu, not the header. `e2e/layout.spec.ts` checks every page in every Lang for horizontal scroll.

## Print CV

`/{lang}/cv/print` (route `$lang_.cv.print.tsx`, `PrintCvPage` in `src/pages/cv/`) is what Browser Rendering prints to the CV PDF ([ADR-0003](../adr/0003-cv-pdf-via-browser-rendering.md)).

- **Outside the layout:** the `_` in `$lang_` keeps it out of `/$lang`, so no header, footer or menu; the route checks the Lang and renders `DirectionProvider` and `LangHead` itself.
- **Always light:** `staticData: { theme: "light" }` on the route; the root route passes it to `ThemeProvider` as `forcedTheme`. The inline script in `index.html` matches the path too, so a dark visitor sees no flash.
- **Sections:** `loadCv(lang, signal, "print")` asks `cv-sections?form=print` (`show_pdf`). No photo, no Fallback notice, links spelled out.
- **One A4 page:** `print-sheet` in `src/index.css` with `@page cv`. The tokens stay; `--print-zoom` scales them all. Check with real content: `e2e/cv.spec.ts` prints the mock data only.
- **Ready flag:** `<html data-print-ready>` (`PRINT_READY_ATTRIBUTE` in `contracts/cv-pdf.ts`) once the data is rendered and `document.fonts.ready`; Browser Rendering waits for it before `page.pdf()`.
- **CV PDF** (`worker/README.md` › CV PDF): the admin's **CV PDF** page (`ui/cv-pdf-page.tsx`, route `admin/cv-pdf.tsx`) generates or uploads one per Lang. The Web CV loads `cv-pdf` with the rest (`loadCv`, web form only) and shows `CvPdfLink` in the header's `actions`: the Lang's own PDF, else the EN one labelled so, nothing while neither exists.

## Public data

Public pages read `/api/public/:lang/*` (`worker/README.md` › Public API) through route loaders, no data library.

- **Client:** `@/shared/api` has one function per endpoint (`getProjects(lang, { signal })`…). Answers are checked against `contracts/api/public.ts`; anything else throws `PublicApiError` (`status`, `code`: an API code, `network_error` or `bad_response`). `isNotFound(error)` tells a 404.
- **Loader:** a page slice exports `load<Page>(lang, signal)` from `api/`; the route passes `params.lang` and `abortController.signal`. A missing slug throws `notFound()` there, and the route sets `notFoundComponent: NotFoundPage`.
- **States:** the route sets `pendingComponent: () => <PagePending title="nav.x" />` and `errorComponent: () => <PageError title="nav.x" />` from `@/shared/ui/page-state`. Both keep the page title, so nothing jumps; PageError retries with `router.invalidate()`.
- **Cache:** `defaultStaleTime` in `src/main.tsx` keeps loader data for the API's `max-age` (60 s). The Lang is a route param, so another Lang loads its own data.
- **Fallback:** next to an entity with `fallback: true` render `<FallbackNotice fallback={x.fallback} />` (`@/shared/ui/fallback-notice`), and put `lang={fallbackLang(x)}` on the element with its text, not on the notice.
- **E2E:** `e2e/public-data.spec.ts` mocks `/api/public/*`: the D1 behind `vite preview` is empty.

## Project card

`ProjectCard` (`@/entities/project`) is the card of a Project on `/{lang}/projects` and, from stage 6, of the Featured ones on the home page. `ProjectStatus` is its status badge; the Case Study page shows it too.

- **Link:** with a Case Study the whole card is one link to `/{lang}/projects/:slug`, named by the title (a stretched `::after`); GitHub and the demo sit above it with `relative z-10`. Without one only those links remain and the card doesn't react to hover.
- **Cover:** `coverKey` through Cloudflare Images (`imageUrl`), a `srcset` up to 1280w and `sizes` for the 1/2/3-column grid. `priority` (the first card) loads it at once with `fetchpriority="high"`; the others are `loading="lazy"`. No cover: the logo tiles.
- **Status:** `in_progress` is `badge-success`, the others neutral; each with its icon and the `project.status.*` text.
- **E2E:** `e2e/projects.spec.ts`.

## Case Study

`/{lang}/projects/:slug` (`ProjectPage` in `src/pages/project/`): the header of the Project (title, status, description, technologies, links, cover at `fetchpriority="high"`) and its Case Study. `ProjectTechnologies` and `ProjectLinks` (`@/entities/project`) are the card's own.

- **404:** `loadProject` throws `notFound()` for an unknown slug and for a Project whose `caseStudy` is null; its `meta` comes from `projectMeta` (`contracts/meta.ts`), the same the Worker injects.
- **Markdown:** `Markdown` (`@/shared/ui/markdown`, react-markdown + GFM) renders Markdown from D1. Raw HTML is dropped, `javascript:` and `data:` URLs are emptied; headings go one level down (the page title is the only h1). Links to `http(s)` open in a new tab with `rel="noopener noreferrer"`. Images on `/media/<key>` go through Cloudflare Images; any other image is its alt text (CSP `img-src 'self'`).
- **Code:** fenced blocks render through `CodeBlock` (`code-block.tsx`): `dir="ltr"`, their own scroll region, the language in `data-language`. Shiki (stage 5) goes in there; inline code is `dir="ltr"` too.
- **Fallback:** `lang={fallbackLang(project)}` on the title, the description and the `Markdown`.
- **Unit:** `markdown.test.tsx` renders to static HTML; **E2E:** `e2e/projects.spec.ts`.

## Gallery

`/{lang}/gallery` (`GalleryPage` in `src/pages/gallery/`): the Albums as a card grid, from `albums` (`loadAlbums`). `AlbumCard` stays in the page slice until a second slice needs it (Steiger's `insignificant-slice`). The whole card is one link to the Album, as a Project card.

- **Cover:** `cover` (`key`, `width`, `height`) through `imageSrcSet`, with `sizes` for the 1/2/3-column grid and the photo's `width`/`height` against CLS, cropped to 4:3. The first card's at `fetchpriority="high"`, the others `loading="lazy"`; no photos, the logo tiles.
- **Count:** `photoCount` through `useTPlural()` (`@/shared/i18n`): a plural message has a key per `Intl.PluralRules` category (`album.photos.zero` … `.other`) in every dictionary, `{count}` formatted for the Lang.
- **Fallback:** `FallbackNotice` under an EN title, `lang="en"` on the title.
- **E2E:** `e2e/gallery.spec.ts`.

## Album

`/{lang}/gallery/:slug` (`AlbumPage` in `src/pages/album/`): the title, the photo count and the photos of an Album from `albums/:slug` (`loadAlbum`). An unknown slug throws `notFound()`; its `meta` comes from `albumMeta` (`contracts/meta.ts`), the same the Worker injects.

- **Masonry:** CSS grid, no layout script. A grid row is 1/50 of a column's width (`--row`, from `100cqi` of the `@container`), so a photo spans `round(50 × height / width)` rows plus the gap's 3. Auto-placement keeps D1's order row by row, each photo in the shortest column. Two columns, three from `sm`, four from `lg`. Change the numbers in `ROWS_PER_WIDTH`/`GAP_ROWS` and in the grid's classes together.
- **Images:** `imageSrcSet` with `sizes` for the columns, `width`/`height` of the photo. The first row (4) loads at once, the first at `fetchpriority="high"`; the rest `loading="lazy"`; all `decoding="async"`.
- **Alt:** the caption (`lang="en"` when it is the Fallback), else `album.photo` (“Photo 2 of 6”).
- **Lightbox** (`ui/lightbox.tsx`, loaded lazily): each photo is a link to `?photo=<id>` (`parsePhotoSearch` on the route), so a photo can be shared. Opening pushes an entry with `state.lightbox`; paging replaces it; closing goes Back, or (opened from a shared link) drops `photo` from the URL. Radix traps the focus and closes on Esc; the thumbnail of the photo shown last takes the focus back.
- **Paging:** buttons, ←/→ and touch swipes, round the ends. Arrows and swipes go through `flipX`: in RTL ← and a swipe to the right go forward. The photo is never mirrored. Its neighbours preload in the size the Lightbox `sizes` picks (`lib/lightbox-image.ts`).
- **E2E:** `e2e/gallery.spec.ts`; **Meta:** `worker/meta/serve-page.test.ts`.

## Admin

`/admin` ([ADR-0004](../adr/0004-cloudflare-access-for-admin.md)) sits outside `/$lang`: its own layout, EN only, `<html dir="ltr">`, `noindex`. Routes are in `src/app/routes/admin/`, everything else in one page slice, `src/pages/admin/`.

- **Lazy:** admin route files hold only `component`, so the router puts the admin in its own chunks. `e2e/admin.spec.ts` checks that no public page loads a script with `/api/admin` in it.
- **Shared code splits chunks:** every module the admin shares with the public pages (a kit component, a feature, an icon) moves out of its public chunk into a chunk of its own: more files and a bit more gzip on every public page. Import only what the admin needs; no theme switcher, no `useDirection`.
- **API:** `api/admin-api.ts` calls `/api/admin/*`, checks answers against the schemas in `contracts/api/admin.ts` and throws `AdminApiError` (`code`, `status`, 422 `fields`). Data loads through `useResource(key, load)`.
- **Entities:** `model/entities.ts` describes each entity once: its schemas, list columns and `fields`. Lists, the create dialog, the editor and the nav are built from it, so a new entity is one entry there (after its API). A field marked `translated` goes on the Lang tabs; `create: false` keeps it out of the create dialog.
- **Editor** (`ui/entity-editor-page.tsx`): the untranslated fields save with `PATCH`, each Lang tab with `PUT /translations/:lang`; the tab shows how many of its fields are filled, `ar` controls get `dir="rtl"`. Leaving with unsaved changes asks first (`useBlocker`). Bodies and checks are in `lib/form.ts`.
- **Markdown:** a `markdown` field (a post's body, a case study) is `ui/markdown-input.tsx`: the text and a preview through the site's own `Markdown`, side by side from `lg` (the Translations section widens for it), below that one at a time with Text / Preview. The preview renders 300 ms after the last keystroke.
- **Images in Markdown:** images dropped or pasted into a `markdown` field upload through the photos' `UploadQueue` (`ui/use-markdown-images.ts`). Each gets a placeholder at the caret (`![Uploading…](#upload-<n>)`), swapped for `![](/media/<key>)` with the caret inside `[]` for the alt text, or removed on a failure, whose error shows under the editor. Text edits are in `lib/markdown-images.ts`. An upload whose placeholder is gone is deleted from R2; one already in the text stays even if the text is never saved.
- **Posts:** `publishable` puts the status and Publish / Unpublish above the fields (`PATCH { status }`, held while anything is unsaved); the first publish dates `publishedAt` on the Worker. The reading time is the Worker's, counted from the body on every save of a Translation (`worker/api/reading-time.ts`), so the form has no field for it. A `refs` field with `addable` (the tags) creates a new row of its entity right below the list and picks it.
- **Order:** an `ordered` entity's rows are dragged by their handle in `EntityTable` (`@dnd-kit`), with the mouse or the keyboard (Space, arrows, Space; Escape cancels), and the new order is saved at once with `PUT /order`. The dropped order shows while it saves; a failure puts the old one back. Photos are ordered within one album: on `/admin/photos` only once an album is picked.
- **Gallery:** an entity with `gallery` (albums: `photos`) lists the rows of that scoped entity under its editor (`ui/gallery-section.tsx`) with a drop zone for many files at once. `model/upload-queue.ts` runs 3 uploads at a time, then creates the rows one by one in the order chosen (each gets the next `position`, `width`/`height` from the upload). A failed file shows its error and waits for Retry; a 429 pauses the whole queue for a minute (Rate limits allow 20 uploads a minute). Uploads never saved are deleted when dismissed or on leaving.
- **Cover:** a `cover` field (an album's `coverKey`) picks the file of one of the gallery's rows (`ui/cover-input.tsx`); none picked means the first one. The editor loads the gallery's rows once, for the field and the list.
- **Captions:** a Translation the entity can do without (a photo's caption) is removed when saved empty, never stored empty.
- **Files:** `ui/file-input.tsx` uploads at once (XHR, for progress) and previews `/media/<key>`. The replaced or removed file is deleted from R2 after the save; uploads never saved are deleted when the dialog or editor closes.
- **E2E:** `e2e/admin.spec.ts` mocks `/api/admin/*` on `vite preview`. `e2e/admin-editor.spec.ts` (Playwright project `dev`) runs against the real Worker: `scripts/e2e-dev.mjs` starts `vite dev` on port 5174 with a fresh, migrated D1 and R2 in `.wrangler/e2e` and `ACCESS_DEV_EMAIL` set.
- **Locally:** `npm run dev` with `ACCESS_DEV_EMAIL` in `.dev.vars` and a migrated local D1 (`worker/README.md` › Admin access), then open `http://localhost:5173/admin`.
