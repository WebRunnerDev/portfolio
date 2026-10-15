---
version: alpha
name: WebRunner
description: Portfolio for recruiters. Graphite surfaces, one rust accent, sharp edges with chamfered corners, rhombus tiles from the logo.
x-zsd:
  profile: "0.1"
  kind: project
  source:
    method: authored
    paths:
      - docs/design-brief.md
      - docs/grilling/2026-10-14-detailed-plan.md
      - public/logo.svg
    captured: 2026-10-15
  review:
    status: draft
  intent:
    audience: Recruiters and hiring managers.
    primary-task: Find the skill level in two minutes, open projects and the CV, download the CV PDF, or make contact.
    character: Industrial futurism. Graphite surfaces, one rust accent, sharp edges, rhombus tiles.
    density: comfortable
    theme: system default with a light and a dark mode
    references:
      - public/logo.svg
  preferences:
    must-use:
      - Rust accent in both modes, only for the main action, focus, the active navigation item, and rhombus tiles.
      - Zero radius. Chamfered corners at 45 degrees on cards and the main action.
      - A border on each raised surface, because surface contrast is low.
      - Fonts that contain Kazakh Cyrillic and Latin diacritics.
      - Logical CSS properties. Mirror the layout for the ar Lang.
    must-avoid:
      - Rounded pill shapes and soft drop shadows.
      - A permanent accent shadow or large rust fills.
      - Text in a gray that is below 4.5:1 on its surface.
      - Status feedback that depends only on color.
      - Mirrored logo, hero, music player, or code blocks.
    preserve:
      - Rust value from the source palette as the primary color in both modes.
      - Dark text and surface values from the source palette.
  implementation:
    token-source: DESIGN.md
    component-sources:
      - src/shared/ui/kit
    style-sources:
      - src/index.css
      - src/styles/tokens.css
    font-assets:
      - "@fontsource-variable/tektur"
      - "@fontsource-variable/onest"
      - "@fontsource-variable/fira-code"
      - "@fontsource-variable/readex-pro"
    image-assets:
      - public/logo.svg
    icon-assets:
      - lucide-react
  unresolved:
    - External reference sites.
    - Hero effect for the full tier.
    - Gallery photo crop ratios.
  layout:
    viewport-min: 320px
    content-max: 1200px
    prose-max: 720px
    header-height: 56px
  breakpoints:
    sm: 640px
    md: 768px
    lg: 1024px
    xl: 1280px
  border:
    width-default: 1px
    color-default: "{colors.outline-muted}"
    color-control: "{colors.outline}"
    chamfer-sm: 6px
    chamfer-md: 12px
  elevation:
    shadow-accent: 0 0 16px
  motion:
    duration-fast: 120ms
    duration-base: 200ms
    duration-slow: 400ms
    easing-standard: cubic-bezier(0.2, 0, 0, 1)
    easing-exit: cubic-bezier(0.4, 0, 1, 1)
  accessibility:
    target-min: "{spacing.control-height}"
    focus-width: 2px
    focus-offset: 2px
    focus-color: "{colors.primary-text}"
  modes:
    dark:
      colors:
        primary: "#B84530"
        primary-hover: "#9A3826"
        on-primary: "#FFFFFF"
        primary-text: "#DA6A52"
        surface: "#121212"
        on-surface: "#E0E0E0"
        surface-raised: "#1E1E1E"
        on-surface-muted: "#8A94A6"
        on-surface-disabled: "#8C8C8C"
        outline: "#6B7280"
        outline-muted: "#2E2E2E"
        error: "#F87171"
        on-error: "#121212"
        success: "#4ADE80"
        on-success: "#121212"
colors:
  primary: "#B84530"
  primary-hover: "#9A3826"
  on-primary: "#FFFFFF"
  primary-text: "#A83F2C"
  surface: "#F3F4F6"
  on-surface: "#0F172A"
  surface-raised: "#E5E7EB"
  on-surface-muted: "#334155"
  on-surface-disabled: "#5F6672"
  outline: "#6B7280"
  outline-muted: "#D1D5DB"
  error: "#B91C1C"
  on-error: "#FFFFFF"
  success: "#166534"
  on-success: "#FFFFFF"
typography:
  display-lg:
    fontFamily: "Tektur Variable, Readex Pro Variable, system-ui, sans-serif"
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: 0px
  headline-lg:
    fontFamily: "Tektur Variable, Readex Pro Variable, system-ui, sans-serif"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: 0px
  headline-md:
    fontFamily: "Tektur Variable, Readex Pro Variable, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0px
  headline-sm:
    fontFamily: "Tektur Variable, Readex Pro Variable, system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0px
  body-lg:
    fontFamily: "Onest Variable, Readex Pro Variable, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0px
  body-md:
    fontFamily: "Onest Variable, Readex Pro Variable, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0px
  body-sm:
    fontFamily: "Onest Variable, Readex Pro Variable, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  label-md:
    fontFamily: "Onest Variable, Readex Pro Variable, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0px
  label-mono:
    fontFamily: "Fira Code Variable, ui-monospace, monospace"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 1px
  code-md:
    fontFamily: "Fira Code Variable, ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 64px
  section-lg: 96px
  control-height: 44px
rounded:
  none: 0px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.lg}"
    height: "{spacing.control-height}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.lg}"
    height: "{spacing.control-height}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.lg}"
    height: "{spacing.control-height}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.md}"
    height: "{spacing.control-height}"
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.xl}"
  badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-mono}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-success}"
    typography: "{typography.label-mono}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
  button-disabled:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface-disabled}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.lg}"
    height: "{spacing.control-height}"
  link:
    textColor: "{colors.primary-text}"
    typography: "{typography.body-md}"
  tile:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.none}"
  tile-inactive:
    backgroundColor: "{colors.outline-muted}"
    rounded: "{rounded.none}"
  alert-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.lg}"
---

# WebRunner

## Overview

WebRunner is a developer portfolio for recruiters.
The character is industrial futurism: graphite surfaces, one rust accent, sharp edges, and rhombus tiles from the logo.
Graphite carries most of each page. Rust marks only the item that needs attention.
The ar Lang uses a mirrored layout.

### Implementation

Read the paths in `x-zsd.implementation` before UI changes.
Change the tokens of the shadcn components in `src/shared/ui/kit`, not their markup.
Record unresolved choices in `x-zsd.unresolved`.

## Colors

The light mode is the base. `x-zsd.modes.dark` gives the dark values with the same keys.
The system preference selects the mode until the user selects a mode.

- `primary`: Use for the main action, the active navigation item, and rhombus tiles. Use one main action in each view.
- `primary-hover`: Use for the main action on hover and press.
- `on-primary`: Use for text and icons on `primary` and `primary-hover`.
- `primary-text`: Use for accent text, text links, the focus outline, and the accent shadow.
- `surface`: Use for the page and for input fields.
- `on-surface`: Use for headings and body text.
- `surface-raised`: Use for cards, the header, menus, and dialogs. Always add a border.
- `on-surface-muted`: Use for dates, metadata, helper text, and neutral badges.
- `on-surface-disabled`: Use for the text of controls that cannot operate. A disabled control has no border.
- `outline`: Use for control boundaries, for example inputs and the secondary button.
- `outline-muted`: Use for card borders, dividers, and inactive tiles.
- `error`: Use for error text, invalid field boundaries, and error alerts.
- `on-error`: Use for text on `error`.
- `success`: Use for success text and the active project status.
- `on-success`: Use for text on `success`.

### Contrast pairs

All text pairs are 4.5:1 or more in both modes. Control boundaries and the focus outline are 3:1 or more.
In dark mode, `primary` on `surface` is 3.5:1. Use it for fills and shapes only, not for text.
`error` and `primary` are both red hues. Always show an error with an icon and a text message.

## Typography

Each family contains Kazakh Cyrillic and Latin diacritics. We checked the font files on 2026-10-15.
Readex Pro is second in each stack. It contains only the Arabic range, so the browser loads it only for Arabic text.

- `display-lg`: Use for the brand name in the hero, one time on the home page.
- `headline-lg`: Use for the page title. Use one page title in each view.
- `headline-md`: Use for section titles.
- `headline-sm`: Use for card titles and dialog titles.
- `body-lg`: Use for the hero subtitle and the intro paragraph of a post.
- `body-md`: Use for body text, input text, and descriptions.
- `body-sm`: Use for helper text, card descriptions, and the footer.
- `label-md`: Use for button and navigation text. Use sentence case.
- `label-mono`: Use for dates, technology tags, and badges. Use uppercase, but not for Arabic.
- `code-md`: Use for code blocks and inline code. Code is always left to right.

Below `x-zsd.breakpoints.md`, use `headline-lg` for the hero brand and `headline-md` for page titles.
Limit prose lines to `x-zsd.layout.prose-max`. Wrap long words and URLs.

## Layout

Center the content within `x-zsd.layout.content-max`. Use `lg` page padding below `md` and `xxl` above.
Use `section` between page sections below `lg` and `section-lg` above.
Use `xl` between cards, `md` inside controls, and `sm` between related items.
Keep each pointer target at least `control-height` in both dimensions.

### Responsive behavior

- Below `sm`: one column of cards. Two columns in the gallery.
- From `sm`: two columns of project cards. Long titles fit in two lines.
- From `md`: the CV shows the date column beside each entry.
- From `lg`: three columns of cards. Four columns in the gallery.
- From `xl`: no new layout. The content stops at `x-zsd.layout.content-max`.

The header shows the logo, the current section, the Lang control, the mode control, and the menu button.
A full-screen menu replaces a navigation bar at all widths.
Do not let the page scroll horizontally at `x-zsd.layout.viewport-min`. Code blocks scroll in their own region.
Keep the reading sequence and the keyboard sequence the same in each layout.

## Elevation & Depth

Show depth with `surface-raised` and a border, not with drop shadows.
Apply `x-zsd.border.width-default` with `x-zsd.border.color-default` on each raised surface.
In dark mode only, add `x-zsd.elevation.shadow-accent` in `primary-text` at 40% opacity on hover and focus.

## Shapes

- `none`: Use for all components. The interface has no rounded corners.

Cut the top end corner of cards with `x-zsd.border.chamfer-md` and of the main action with `x-zsd.border.chamfer-sm`.
Draw the chamfer border with an inner layer or an SVG, because a clip path removes borders and outlines.
Rhombus tiles are squares at 45 degrees, as in `public/logo.svg`.

## Components

### Button

Use `button-primary` for the main action. Use `button-secondary` with an `outline` border for other actions.

- On hover, use `button-primary-hover`. In dark mode, add the accent shadow.
- On press, keep the position and the size.
- During loading, keep the width, show a progress label, and prevent a second submission.
- Use `button-disabled` when an action cannot operate. Explain the cause when useful.

### Link

Use `link` for text links. Underline links in body text.

### Input

Inputs occur in the admin area. Use `input` with an `outline` border and a visible label above the field.
For an invalid value, use `error` on the boundary and the message, and keep the entered value.

### Card

Use `card` for projects and posts. The whole card is one link with its title as the accessible name.
Put other links, for example GitHub, outside the card link.
On hover, change the border to `primary`. For an empty list, explain what appears there.

### Badge

Use `badge` with an `outline-muted` border for technology tags. Use `badge-success` for an active project, always with its status text.

### Tile

Use `tile` for rhombus decoration, the loader, the player button, and the menu animation. Use `tile-inactive` for inactive tiles.
The logo uses `on-surface` through `currentColor`. Hide decorative tiles from assistive technology.

### Alert

Use `alert-error` when a task fails. State what failed and give a recovery action.

## Do's and Don'ts

- Do use one main action in each view.
- Do keep a border on each raised surface.
- Do use logical properties so that the ar Lang mirrors the layout.
- Do test real Kazakh, German, and Arabic text in narrow layouts.
- Do not use rust for large fills or for body text in dark mode.
- Do not use rounded corners or soft drop shadows.
- Do not mirror the logo, the hero, the music player, or code blocks.
- Do not put a clip path on the element that has the focus outline.

## Motion

Use `x-zsd.motion.duration-fast` for hover and press and `x-zsd.motion.duration-base` for menus and dialogs.
Use `x-zsd.motion.duration-slow` for the menu tile layout and page transitions.
Use `x-zsd.motion.easing-standard` to enter and `x-zsd.motion.easing-exit` to leave.
Horizontal motion goes in the reading direction, so the ar Lang inverts it.
With reduced motion, change states immediately and use a fade for page transitions. Show the loader as static tiles with a text label.

## Iconography

Use lucide icons at 16 or 20 pixels with a stroke width of 1.5.
Directional icons rotate in the ar Lang. Give each icon-only control an accessible name.

## Imagery

Do not apply filters to photos. Give each photo alternative text.

## Accessibility

Support keyboard operation in the reading sequence.
Use `x-zsd.accessibility.focus-width`, `x-zsd.accessibility.focus-offset`, and `x-zsd.accessibility.focus-color` for the focus outline.
Keep focus visible under the sticky header. Move focus into the full-screen menu and return it on close.

### Review checks

Examine both modes, the ar Lang, narrow layouts, long Kazakh and German words, keyboard focus, and reduced motion.
