import { useEffect, useState, type ComponentProps, type ReactNode } from "react"
import { getRouteApi } from "@tanstack/react-router"
import { CircleAlert, CircleCheck, ExternalLink, Loader2 } from "lucide-react"

import { LANGS, langDirection } from "@contracts/lang"
import { useDirection } from "@/shared/lib/direction"
import { cn } from "@/shared/lib/utils"
import { CARD_TITLE_SHIFT, CardCorner } from "@/shared/ui/card"
import { Button } from "@/shared/ui/kit"
import { Loader } from "@/shared/ui/loader"
import { Logo } from "@/shared/ui/logo"
import { Reveal, RevealText } from "@/shared/ui/reveal"

// Design showcase: renders DESIGN.md tokens with real fonts in both modes.
// Not linked from navigation and marked noindex. /ar/design shows RTL.
const route = getRouteApi("/$lang/design")

const COLOR_TOKENS = [
  ["primary", "Main action, active nav item, tiles"],
  ["primary-hover", "Main action on hover and press"],
  ["on-primary", "Text on primary"],
  ["primary-text", "Accent text, links, focus, accent shadow"],
  ["surface", "Page, inputs"],
  ["on-surface", "Headings, body text"],
  ["surface-raised", "Cards, header, menus, dialogs"],
  ["on-surface-muted", "Dates, metadata, helper text"],
  ["on-surface-disabled", "Disabled controls"],
  ["outline", "Control boundaries"],
  ["outline-muted", "Card borders, dividers, inactive tiles"],
  ["error", "Errors"],
  ["on-error", "Text on error"],
  ["success", "Success, active project"],
  ["on-success", "Text on success"],
] as const

type ColorToken = (typeof COLOR_TOKENS)[number][0]

// [foreground, background, minimum ratio]
const CONTRAST_PAIRS: [ColorToken, ColorToken, number][] = [
  ["on-surface", "surface", 4.5],
  ["on-surface", "surface-raised", 4.5],
  ["on-surface-muted", "surface", 4.5],
  ["on-surface-muted", "surface-raised", 4.5],
  ["primary-text", "surface", 4.5],
  ["primary-text", "surface-raised", 4.5],
  ["on-primary", "primary", 4.5],
  ["on-primary", "primary-hover", 4.5],
  ["on-surface-disabled", "surface-raised", 4.5],
  ["error", "surface", 4.5],
  ["on-error", "error", 4.5],
  ["on-success", "success", 4.5],
  ["outline", "surface", 3],
  ["primary", "surface", 3],
]

const COLOR_VARS = COLOR_TOKENS.map(([t]) => `--zsd-colors-${t}`)

const TYPE_TOKENS = [
  ["display-lg", "font-zsd-display-lg text-zsd-display-lg", "Hero brand, once"],
  ["headline-lg", "font-zsd-headline-lg text-zsd-headline-lg", "Page title"],
  ["headline-md", "font-zsd-headline-md text-zsd-headline-md", "Section title"],
  ["headline-sm", "font-zsd-headline-sm text-zsd-headline-sm", "Card title"],
  ["body-lg", "font-zsd-body-lg text-zsd-body-lg", "Hero subtitle, post intro"],
  ["body-md", "font-zsd-body-md text-zsd-body-md", "Body text"],
  ["body-sm", "font-zsd-body-sm text-zsd-body-sm", "Helper text, footer"],
  ["label-md", "font-zsd-label-md text-zsd-label-md", "Buttons, navigation"],
  [
    "label-mono",
    "font-zsd-label-mono text-zsd-label-mono uppercase rtl:normal-case",
    "Dates, tags, badges",
  ],
  ["code-md", "font-zsd-code-md text-zsd-code-md", "Code"],
] as const

const SAMPLES = {
  en: "Recruiters review projects, the CV, and contact details.",
  ru: "Съешь же ещё этих мягких французских булок, да выпей чаю.",
  kk: "Аққу, ғажайып әуен, қоңыр өлең, ұшқыр үміт, һәм іңкәр.",
  de: "Zwölf Boxkämpfer jagen Viktor quer über den großen Sylter Deich.",
  es: "¿El pingüino Wenceslao hizo kilómetros bajo exhaustiva lluvia?",
  ar: "صف خلق خود كمثل الشمس إذ بزغت يحظى الضجيع بها نجلاء معطار",
} as const

const SPACING_TOKENS = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "xxl",
  "section",
  "section-lg",
  "control-height",
] as const

const SPACING_VARS = SPACING_TOKENS.map((t) => `--zsd-spacing-${t}`)

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
const MOTION_FAST =
  "transition-colors duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover motion-reduce:transition-none"

export function DesignPage() {
  const { lang } = route.useParams()
  const { dir } = useDirection()

  return (
    <div
      lang={lang}
      dir={dir}
      className="mx-auto w-full max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg md:px-zsd-xxl"
    >
      <div className="py-zsd-section lg:py-zsd-section-lg">
        <div className="flex items-center gap-zsd-md">
          <p className="font-zsd-label-mono text-zsd-label-mono text-zsd-primary-text uppercase rtl:normal-case">
            DESIGN.md · draft
          </p>
          <BreakpointBadge />
        </div>
        <h1 className="mt-zsd-sm font-heading text-zsd-headline-md md:text-zsd-headline-lg">
          Design system
        </h1>
        <p className="mt-zsd-lg max-w-(--zsd-x-zsd-layout-prose-max) text-zsd-body-lg text-zsd-on-surface-muted">
          Every token from DESIGN.md with real fonts. Switch the mode and the
          Lang in the header. Press Tab to check the focus outline; select text
          to check the selection.
        </p>
      </div>
      <ColorsSection />
      <TypographySection />
      <LayoutSection />
      <ShapesSection />
      <ButtonsSection />
      <FormSection />
      <CardsSection />
      <FeedbackSection />
      <TilesSection />
      <MotionSection />
      <ShadcnSection />
      <p className="py-zsd-xl text-center text-zsd-body-sm text-zsd-on-surface-muted">
        Source of truth: DESIGN.md → src/styles/tokens.css
      </p>
    </div>
  )
}

function BreakpointBadge() {
  return (
    <span
      className="border border-zsd-outline-muted px-zsd-sm py-zsd-xs font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted"
      title="Current breakpoint"
    >
      <span className="sm:hidden">base</span>
      <span className="max-sm:hidden md:hidden">sm</span>
      <span className="max-md:hidden lg:hidden">md</span>
      <span className="max-lg:hidden xl:hidden">lg</span>
      <span className="max-xl:hidden">xl</span>
    </span>
  )
}

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string
  title: string
  lead?: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className="border-t border-border py-zsd-section lg:py-zsd-section-lg"
    >
      <h2 id={id} className="font-heading text-zsd-headline-md">
        {title}
      </h2>
      {lead && (
        <p className="mt-zsd-sm max-w-(--zsd-x-zsd-layout-prose-max) text-zsd-body-md text-zsd-on-surface-muted">
          {lead}
        </p>
      )}
      <div className="mt-zsd-xl">{children}</div>
    </section>
  )
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-zsd-md font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase rtl:normal-case">
      {children}
    </h3>
  )
}

/* ---------- Colors ---------- */

function useComputedVars(names: readonly string[]) {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement)
      setValues(
        Object.fromEntries(
          names.map((n) => [n, style.getPropertyValue(n).trim().toUpperCase()])
        )
      )
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [names])

  return values
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a: string, b: string) {
  if (!/^#[0-9A-F]{6}$/.test(a) || !/^#[0-9A-F]{6}$/.test(b)) return 0
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function ColorsSection() {
  const values = useComputedVars(COLOR_VARS)
  const hex = (t: ColorToken) => values[`--zsd-colors-${t}`] ?? ""

  return (
    <Section
      id="colors"
      title="Colors"
      lead="Values switch with the mode. Hex codes and ratios are read live from the page."
    >
      <ul className="grid grid-cols-2 gap-zsd-lg sm:grid-cols-3 lg:grid-cols-5">
        {COLOR_TOKENS.map(([token, use]) => (
          <li key={token} className="border border-border bg-card">
            <div
              className="h-20 border-b border-border"
              style={{ backgroundColor: `var(--zsd-colors-${token})` }}
            />
            <div className="p-zsd-md">
              <p className="font-zsd-code-md text-zsd-body-sm font-semibold wrap-break-word">
                {token}
              </p>
              <p className="font-zsd-code-md text-zsd-body-sm text-zsd-on-surface-muted">
                {hex(token)}
              </p>
              <p className="mt-zsd-xs text-zsd-body-sm text-zsd-on-surface-muted">
                {use}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-zsd-xxl">
        <Caption>Contrast pairs</Caption>
        <ul className="grid gap-zsd-sm sm:grid-cols-2 lg:grid-cols-3">
          {CONTRAST_PAIRS.map(([fg, bg, min]) => {
            const ratio = contrast(hex(fg), hex(bg))
            const pass = ratio >= min
            return (
              <li
                key={`${fg}/${bg}`}
                className="flex items-center gap-zsd-md border border-border p-zsd-sm"
              >
                <span
                  className="flex size-12 shrink-0 items-center justify-center border border-border font-heading text-zsd-headline-sm"
                  style={{
                    color: `var(--zsd-colors-${fg})`,
                    backgroundColor: `var(--zsd-colors-${bg})`,
                  }}
                  aria-hidden
                >
                  Aa
                </span>
                <span className="min-w-0 flex-1 font-zsd-code-md text-zsd-body-sm wrap-break-word">
                  {fg}
                  <span className="text-zsd-on-surface-muted"> on </span>
                  {bg}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-zsd-xs font-zsd-code-md text-zsd-body-sm",
                    pass ? "text-zsd-success" : "text-zsd-error"
                  )}
                >
                  {pass ? (
                    <CircleCheck className="size-4" aria-hidden />
                  ) : (
                    <CircleAlert className="size-4" aria-hidden />
                  )}
                  {ratio.toFixed(2)}
                  <span className="sr-only">
                    {pass ? "passes" : "fails"} {min}:1
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}

/* ---------- Typography ---------- */

function TypographySection() {
  return (
    <Section
      id="typography"
      title="Typography"
      lead="Tektur for headlines, Onest for text, Fira Code for code and labels. Readex Pro renders Arabic only."
    >
      <ul className="divide-y divide-border border-y border-border">
        {TYPE_TOKENS.map(([token, className, use]) => (
          <li
            key={token}
            className="grid gap-zsd-sm py-zsd-lg md:grid-cols-[12rem_1fr] md:gap-zsd-xl"
          >
            <div>
              <p className="font-zsd-code-md text-zsd-body-sm font-semibold">
                {token}
              </p>
              <p className="text-zsd-body-sm text-zsd-on-surface-muted">
                {use}
              </p>
            </div>
            <p className={cn(className, "min-w-0 wrap-break-word")}>
              {token === "display-lg" ? "WebRunner" : SAMPLES.en}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-zsd-xxl">
        <Caption>Every Lang, headline-md and body-md</Caption>
        <ul className="grid gap-zsd-lg md:grid-cols-2">
          {LANGS.map((l) => (
            <li
              key={l}
              lang={l}
              dir={langDirection(l)}
              className="border border-border bg-card p-zsd-lg"
            >
              <span className="font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase">
                {l}
              </span>
              <p className="mt-zsd-sm font-heading text-zsd-headline-md">
                {SAMPLES[l].split(" ").slice(0, 3).join(" ")}
              </p>
              <p className="mt-zsd-xs text-zsd-body-md">{SAMPLES[l]}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-zsd-xxl">
        <Caption>Code is always left to right</Caption>
        <pre
          dir="ltr"
          className="overflow-x-auto border border-border bg-card p-zsd-lg font-zsd-code-md text-zsd-code-md"
        >
          <code>{`export const Route = createFileRoute("/$lang/design")({
  component: DesignPage, // => != === <= -> ligatures
})`}</code>
        </pre>
      </div>
    </Section>
  )
}

/* ---------- Layout ---------- */

function LayoutSection() {
  const values = useComputedVars(SPACING_VARS)

  return (
    <Section
      id="layout"
      title="Layout"
      lead="Spacing tokens and the card grid: 1 column below sm, 2 from sm, 3 from lg."
    >
      <ul className="space-y-zsd-sm">
        {SPACING_TOKENS.map((t) => (
          <li key={t} className="flex items-center gap-zsd-lg">
            <span className="w-32 shrink-0 font-zsd-code-md text-zsd-body-sm">
              {t}
            </span>
            <span
              className="h-4 bg-zsd-primary"
              style={{ inlineSize: `var(--zsd-spacing-${t})` }}
            />
            <span className="font-zsd-code-md text-zsd-body-sm text-zsd-on-surface-muted">
              {values[`--zsd-spacing-${t}`]?.toLowerCase()}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-zsd-xxl">
        <Caption>Card grid</Caption>
        <div className="grid gap-zsd-xl sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="flex h-20 items-center justify-center border border-dashed border-zsd-outline font-zsd-code-md text-zsd-body-sm text-zsd-on-surface-muted"
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ---------- Shapes ---------- */

function ShapesSection() {
  return (
    <Section
      id="shapes"
      title="Shapes"
      lead="Zero radius everywhere. Cards and the main action cut the top end corner at 45°, which flips in RTL."
    >
      <div className="flex flex-wrap items-end gap-zsd-xl">
        <ShapeDemo label="none">
          <div className="size-24 border border-border bg-card" />
        </ShapeDemo>
        <ShapeDemo label="chamfer-sm">
          <ChamferBox className="size-24 chamfer-sm" />
        </ShapeDemo>
        <ShapeDemo label="chamfer-md">
          <ChamferBox className="size-24 chamfer-md" />
        </ShapeDemo>
        <ShapeDemo label="rhombus tile">
          <div className="flex size-24 items-center justify-center">
            <div className="size-16 rotate-45 bg-zsd-primary" />
          </div>
        </ShapeDemo>
      </div>
    </Section>
  )
}

function ShapeDemo({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <figure className="flex flex-col items-center gap-zsd-sm">
      {children}
      <figcaption className="font-zsd-code-md text-zsd-body-sm text-zsd-on-surface-muted">
        {label}
      </figcaption>
    </figure>
  )
}

// Border on a chamfered shape: outer layer is the border colour, inner layer
// the surface, both clipped. A plain `border` would be cut off at the corner.
function ChamferBox({
  className,
  innerClassName,
  children,
}: {
  className?: string
  innerClassName?: string
  children?: ReactNode
}) {
  return (
    <div className={cn("bg-border p-px", className)}>
      <div
        className={cn(
          "size-full bg-card",
          className?.match(/chamfer-(sm|md)/)?.[0],
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}

/* ---------- Buttons ---------- */

function PrimaryButton({
  children,
  force,
  ...props
}: ComponentProps<"button"> & { force?: "hover" | "focus" }) {
  return (
    <button
      type="button"
      className={cn(
        "group/btn focus-chamfer-sm relative hover:elevation-accent focus-visible:elevation-accent disabled:cursor-not-allowed",
        force === "hover" && "elevation-accent",
        force === "focus" && "elevation-accent"
      )}
      data-focus-preview={force === "focus" || undefined}
      {...props}
    >
      <span
        className={cn(
          "flex h-zsd-control-height items-center bg-zsd-primary px-zsd-lg font-zsd-label-md text-zsd-label-md text-zsd-on-primary chamfer-sm",
          MOTION_FAST,
          "group-hover/btn:bg-zsd-primary-hover group-disabled/btn:bg-zsd-surface-raised group-disabled/btn:text-zsd-on-surface-disabled",
          force === "hover" && "bg-zsd-primary-hover"
        )}
      >
        {children}
      </span>
    </button>
  )
}

const SECONDARY_BUTTON = cn(
  "inline-flex h-zsd-control-height items-center gap-zsd-sm border border-zsd-outline bg-zsd-surface px-zsd-lg font-zsd-label-md text-zsd-label-md text-zsd-on-surface hover:bg-zsd-surface-raised disabled:cursor-not-allowed disabled:border-transparent disabled:bg-zsd-surface-raised disabled:text-zsd-on-surface-disabled",
  FOCUS_RING,
  MOTION_FAST
)

function ButtonsSection() {
  const [loading, setLoading] = useState(false)

  const download = () => {
    setLoading(true)
    window.setTimeout(() => setLoading(false), 2000)
  }

  return (
    <Section
      id="buttons"
      title="Buttons and links"
      lead="One main action in each view. Hover and focus are forced in the second and third samples."
    >
      <Caption>Primary</Caption>
      <div className="flex flex-wrap items-center gap-zsd-lg">
        <PrimaryButton>Download CV</PrimaryButton>
        <PrimaryButton force="hover">Hover</PrimaryButton>
        <PrimaryButton force="focus">Focus</PrimaryButton>
        <PrimaryButton disabled>Disabled</PrimaryButton>
        <PrimaryButton
          onClick={download}
          disabled={loading}
          aria-busy={loading}
        >
          <span className="grid">
            <span
              className={cn("col-start-1 row-start-1", loading && "invisible")}
            >
              Click: loading
            </span>
            <span
              className={cn(
                "col-start-1 row-start-1 flex items-center justify-center gap-zsd-sm",
                !loading && "invisible"
              )}
            >
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
              Generating…
            </span>
          </span>
        </PrimaryButton>
      </div>

      <div className="mt-zsd-xl">
        <Caption>Secondary</Caption>
        <div className="flex flex-wrap items-center gap-zsd-lg">
          <button type="button" className={SECONDARY_BUTTON}>
            View projects
          </button>
          <button type="button" className={SECONDARY_BUTTON} disabled>
            Disabled
          </button>
        </div>
      </div>

      <div className="mt-zsd-xl">
        <Caption>Link</Caption>
        <p className="max-w-(--zsd-x-zsd-layout-prose-max) text-zsd-body-md">
          Read the{" "}
          <a
            href="#typography"
            className={cn(
              "text-zsd-primary-text underline underline-offset-4 hover:decoration-2",
              FOCUS_RING
            )}
          >
            case study about PlotOps
          </a>{" "}
          or open the source on{" "}
          <a
            href="https://github.com/WebRunnerDev"
            className={cn(
              "inline-flex items-center gap-zsd-xs text-zsd-primary-text underline underline-offset-4 hover:decoration-2",
              FOCUS_RING
            )}
          >
            GitHub
            <ExternalLink className="size-4 rtl:-scale-x-100" aria-hidden />
          </a>
          .
        </p>
      </div>
    </Section>
  )
}

/* ---------- Form ---------- */

const INPUT = cn(
  "h-zsd-control-height w-full border border-zsd-outline bg-zsd-surface px-zsd-md text-zsd-body-md text-zsd-on-surface placeholder:text-zsd-on-surface-muted disabled:cursor-not-allowed disabled:border-transparent disabled:bg-zsd-surface-raised disabled:text-zsd-on-surface-disabled aria-invalid:border-zsd-error",
  FOCUS_RING
)

function FormSection() {
  return (
    <Section
      id="input"
      title="Inputs"
      lead="Admin only. Visible label above the field. Errors use an icon and text, never color alone."
    >
      <div className="grid max-w-3xl gap-zsd-xl md:grid-cols-3">
        <Field
          id="f-title"
          label="Post title"
          helper="Shown in the list and in OG tags."
          defaultValue="Мой первый пост"
        />
        <Field
          id="f-slug"
          label="Slug"
          error="Use lowercase Latin letters, digits, and hyphens."
          defaultValue="Мой пост!"
        />
        <Field
          id="f-lang"
          label="Lang"
          helper="Set by the route."
          defaultValue="kk"
          disabled
        />
      </div>
    </Section>
  )
}

function Field({
  id,
  label,
  helper,
  error,
  ...input
}: ComponentProps<"input"> & {
  id: string
  label: string
  helper?: string
  error?: string
}) {
  const describedBy = `${id}-desc`
  return (
    <div className="flex flex-col gap-zsd-xs">
      <label htmlFor={id} className="font-zsd-label-md text-zsd-label-md">
        {label}
      </label>
      <input
        id={id}
        className={INPUT}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
      />
      {error ? (
        <p
          id={describedBy}
          className="flex items-start gap-zsd-xs text-zsd-body-sm text-zsd-error"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        <p
          id={describedBy}
          className="text-zsd-body-sm text-zsd-on-surface-muted"
        >
          {helper}
        </p>
      )}
    </div>
  )
}

/* ---------- Cards and badges ---------- */

function CardsSection() {
  return (
    <Section
      id="cards"
      title="Cards and badges"
      lead="The whole card is one link. Hover and keyboard focus turn the border rust, fill the cut corner with a tile and move the title along the reading direction. No shadow."
    >
      <div className="grid gap-zsd-xl sm:grid-cols-2 lg:grid-cols-3">
        <ProjectCard
          title="PlotOps"
          description="Field operations dashboard for agricultural plots with offline sync."
          tags={["React", "TypeScript", "Cloudflare"]}
          active
        />
        <ProjectCard
          title="AITU AMS"
          description="Attendance management system for Astana IT University."
          tags={["Next.js", "PostgreSQL"]}
        />
        <div className="flex flex-col items-center justify-center gap-zsd-md border border-border p-zsd-xl text-center">
          <div className="flex gap-zsd-xs" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-3 rotate-45 bg-zsd-outline-muted" />
            ))}
          </div>
          <p className="font-heading text-zsd-headline-sm">No posts yet</p>
          <p className="text-zsd-body-sm text-zsd-on-surface-muted">
            Notes about front-end work and photography appear here.
          </p>
        </div>
      </div>

      <div className="mt-zsd-xxl">
        <Caption>Badges</Caption>
        <div className="flex flex-wrap items-center gap-zsd-sm">
          <Badge>React</Badge>
          <Badge>Cloudflare D1</Badge>
          <Badge success>Active</Badge>
        </div>
      </div>
    </Section>
  )
}

function ProjectCard({
  title,
  description,
  tags,
  active,
}: {
  title: string
  description: string
  tags: string[]
  active?: boolean
}) {
  return (
    <article className={cn("group/card focus-chamfer-md relative")}>
      <div
        className={cn(
          "h-full bg-border p-px chamfer-md card-active:bg-zsd-primary",
          MOTION_FAST
        )}
      >
        <div className="flex h-full flex-col gap-zsd-md bg-card p-zsd-xl chamfer-md">
          <TileCover />
          <div className="flex items-start justify-between gap-zsd-md">
            <h3 className="font-heading text-zsd-headline-sm">
              <a
                href="#cards"
                className="card-link outline-none after:absolute after:inset-0"
              >
                <span className={CARD_TITLE_SHIFT}>{title}</span>
              </a>
            </h3>
            {active && <Badge success>Active</Badge>}
          </div>
          <p className="text-zsd-body-sm text-zsd-on-surface-muted">
            {description}
          </p>
          <div className="mt-auto flex flex-wrap gap-zsd-xs">
            {tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          <a
            href="https://github.com/WebRunnerDev"
            className={cn(
              "relative z-10 inline-flex items-center gap-zsd-xs self-start text-zsd-body-sm text-zsd-primary-text underline underline-offset-4",
              FOCUS_RING
            )}
          >
            GitHub
            <ExternalLink className="size-3.5 rtl:-scale-x-100" aria-hidden />
          </a>
        </div>
      </div>
      <CardCorner />
    </article>
  )
}

function TileCover() {
  return (
    <div
      className="flex aspect-video items-center justify-center bg-zsd-surface"
      aria-hidden
    >
      <Logo className="size-16 text-zsd-outline-muted card-active:text-zsd-primary" />
    </div>
  )
}

function Badge({
  children,
  success,
}: {
  children: ReactNode
  success?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-zsd-xs px-zsd-sm py-zsd-xs font-zsd-label-mono text-zsd-label-mono uppercase rtl:normal-case",
        success
          ? "bg-zsd-success text-zsd-on-success"
          : "border border-zsd-outline-muted bg-zsd-surface text-zsd-on-surface-muted"
      )}
    >
      {success && <CircleCheck className="size-3" aria-hidden />}
      {children}
    </span>
  )
}

/* ---------- Feedback ---------- */

function FeedbackSection() {
  return (
    <Section
      id="alert"
      title="Alert"
      lead="State what failed and give a recovery action."
    >
      {/* Static sample: no role="alert", or screen readers announce it on load. */}
      <div className="flex max-w-2xl flex-wrap items-start gap-zsd-md bg-zsd-error p-zsd-lg text-zsd-on-error">
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">PDF generation failed</p>
          <p className="text-zsd-body-sm">
            The renderer timed out. Your CV data is saved.
          </p>
        </div>
        <button
          type="button"
          className={cn(
            "h-9 border border-current px-zsd-md font-zsd-label-md text-zsd-label-md",
            "outline-offset-2 focus-visible:outline-2 focus-visible:outline-current"
          )}
        >
          Try again
        </button>
      </div>
    </Section>
  )
}

/* ---------- Tiles ---------- */

function TilesSection() {
  return (
    <Section
      id="tiles"
      title="Logo and tiles"
      lead="The logo uses currentColor and never mirrors. Decorative tiles are hidden from assistive technology."
    >
      <div className="flex flex-wrap items-end gap-zsd-xl">
        {[16, 32, 64, 128].map((s) => (
          <figure key={s} className="flex flex-col items-center gap-zsd-sm">
            <Logo style={{ inlineSize: s, blockSize: s }} />
            <figcaption className="font-zsd-code-md text-zsd-body-sm text-zsd-on-surface-muted">
              {s}px
            </figcaption>
          </figure>
        ))}
        <figure className="flex flex-col items-center gap-zsd-sm">
          <Logo className="size-32 text-zsd-primary" />
          <figcaption className="font-zsd-code-md text-zsd-body-sm text-zsd-on-surface-muted">
            primary
          </figcaption>
        </figure>
      </div>

      <div className="mt-zsd-xxl grid gap-zsd-xl sm:grid-cols-2">
        <div>
          <Caption>tile / tile-inactive</Caption>
          <div className="flex gap-zsd-lg p-zsd-md" aria-hidden>
            {[true, true, false, true, false, false].map((on, i) => (
              <span
                key={i}
                className={cn(
                  "size-6 rotate-45",
                  on ? "bg-zsd-primary" : "bg-zsd-outline-muted"
                )}
              />
            ))}
          </div>
        </div>
        <div>
          <Caption>Loader (static with reduced motion)</Caption>
          <Loader delay={false} />
        </div>
      </div>
    </Section>
  )
}

/* ---------- Motion ---------- */

function MotionSection() {
  const curves = [
    ["easing-enter", "ease-zsd-enter", "Entering, reveals"],
    ["easing-hover", "ease-zsd-hover", "Hover and press"],
    ["easing-layout", "ease-zsd-layout", "Rhombus tiles"],
    ["easing-exit", "ease-zsd-exit", "Leaving"],
  ] as const
  const durations = [
    ["duration-fast", "duration-(--zsd-x-zsd-motion-duration-fast)"],
    ["duration-base", "duration-(--zsd-x-zsd-motion-duration-base)"],
    ["duration-slow", "duration-(--zsd-x-zsd-motion-duration-slow)"],
  ] as const
  const [run, setRun] = useState(0)

  return (
    <Section
      id="motion"
      title="Motion"
      lead="Hover a row. Movement follows the reading direction, so it flips in RTL. Reduced motion turns it off."
    >
      <div className="grid gap-zsd-xl lg:grid-cols-2">
        <div>
          <Caption>Curves, in duration-slow</Caption>
          <ul className="space-y-zsd-sm">
            {curves.map(([name, cls, use]) => (
              <MotionRow
                key={name}
                name={name}
                note={use}
                className={cn(
                  "duration-(--zsd-x-zsd-motion-duration-slow)",
                  cls
                )}
              />
            ))}
          </ul>
        </div>
        <div>
          <Caption>Durations, in easing-hover</Caption>
          <ul className="space-y-zsd-sm">
            {durations.map(([name, cls]) => (
              <MotionRow
                key={name}
                name={name}
                className={cn("ease-zsd-hover", cls)}
              />
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-zsd-xxl flex flex-wrap items-center justify-between gap-zsd-md">
        <Caption>Reveal and RevealText, once in the viewport</Caption>
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={() => setRun((n) => n + 1)}
        >
          Replay
        </button>
      </div>
      <div key={run} className="space-y-zsd-xl">
        <RevealText
          as="p"
          text={"Heavy graphite\nthat gains speed"}
          className="font-zsd-display-sm text-zsd-display-sm text-balance break-words"
        />
        <RevealText
          as="p"
          by="line"
          delay={0.4}
          text={"Lines move whole:\nfor body text and lists."}
          className="text-zsd-body-lg text-zsd-on-surface-muted"
        />
        <ul className="grid gap-zsd-md sm:grid-cols-4">
          {["stagger-item", "× order", "from the", "inline start"].map(
            (label, i) => (
              <Reveal
                key={label}
                as="li"
                order={i}
                x={40}
                className="border border-border bg-zsd-surface-raised p-zsd-md font-zsd-code-md text-zsd-body-sm"
              >
                {label}
              </Reveal>
            )
          )}
        </ul>
      </div>
    </Section>
  )
}

function MotionRow({
  name,
  note,
  className,
}: {
  name: string
  note?: string
  className: string
}) {
  return (
    <li className="group/motion flex items-center gap-zsd-lg border border-border p-zsd-md">
      <span className="w-32 shrink-0">
        <span className="block font-zsd-code-md text-zsd-body-sm">{name}</span>
        {note && (
          <span className="block text-zsd-body-sm text-zsd-on-surface-muted">
            {note}
          </span>
        )}
      </span>
      <span className="relative h-6 flex-1">
        <span
          className={cn(
            "absolute inset-s-1 top-1 size-4 rotate-45 bg-zsd-primary transition-transform group-hover/motion:translate-x-32 motion-reduce:transition-none rtl:group-hover/motion:-translate-x-32",
            className
          )}
        />
      </span>
    </li>
  )
}

/* ---------- shadcn ---------- */

function ShadcnSection() {
  return (
    <Section
      id="shadcn"
      title="shadcn/ui as generated"
      lead="Stock components on the mapped tokens, before restyling. Use this row to spot drift from DESIGN.md."
    >
      <div className="flex flex-wrap items-center gap-zsd-md">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
        <Button disabled>Disabled</Button>
      </div>
    </Section>
  )
}
