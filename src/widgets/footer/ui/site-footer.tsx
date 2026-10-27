import { ArrowUp, Check, Copy, ExternalLink } from "lucide-react"

import { useT } from "@/shared/i18n"
import { Button } from "@/shared/ui/kit"
import { Reveal, RevealText } from "@/shared/ui/reveal"

import { useCopy } from "../lib/use-copy"
import { CONTACT_LINKS, EMAIL } from "../model/contacts"

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"

const CONTACT_LINK = `inline-flex min-h-zsd-control-height items-center gap-zsd-xs font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface uppercase underline-offset-4 transition-colors hover:text-zsd-primary-text hover:underline motion-reduce:transition-none ${FOCUS_RING}`

// The contact section closing every page (docs/design-brief.md › Footer), so
// there is no contacts page: a label, a large title, the email as the main
// link, the other contacts, then the copyright and a way back up. Its blocks
// rise once it enters the viewport. The copy result shows next to the button
// and is announced through the status region.
export function SiteFooter() {
  const t = useT()
  const { state, copy } = useCopy()

  return (
    <footer className="border-t border-border [view-transition-name:site-footer]">
      <div className="mx-auto max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg md:px-zsd-xxl">
        <div className="pt-zsd-section pb-zsd-xxl lg:pt-zsd-section-lg">
          <Reveal
            as="p"
            className="font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase"
          >
            <span id="footer-contacts">{t("footer.contacts")}</span>
          </Reveal>
          <RevealText
            as="h2"
            text={t("footer.title")}
            delay={0.1}
            className="mt-zsd-sm font-zsd-display-sm text-zsd-headline-lg text-balance break-words hyphens-auto sm:text-zsd-display-sm"
          />
          <Reveal order={1} className="mt-zsd-xl">
            <ul
              aria-labelledby="footer-contacts"
              className="flex flex-wrap gap-x-zsd-xl"
            >
              <li className="mb-zsd-sm flex basis-full flex-wrap items-center gap-x-zsd-sm">
                <a
                  href={`mailto:${EMAIL}`}
                  className={`min-w-0 font-zsd-headline-md text-zsd-headline-sm break-all text-zsd-primary-text underline underline-offset-4 hover:decoration-2 sm:text-zsd-headline-md ${FOCUS_RING}`}
                >
                  {EMAIL}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-zsd-control-height"
                  aria-label={t("footer.copyEmail")}
                  title={t("footer.copyEmail")}
                  onClick={() => copy(EMAIL)}
                >
                  {state === "copied" ? (
                    <Check aria-hidden strokeWidth={1.5} className="size-5" />
                  ) : (
                    <Copy aria-hidden strokeWidth={1.5} className="size-5" />
                  )}
                </Button>
                <span
                  role="status"
                  className="text-zsd-label-md text-zsd-on-surface-muted"
                >
                  {state === "copied" && t("footer.copied")}
                  {state === "failed" && t("footer.copyFailed")}
                </span>
              </li>
              {CONTACT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className={CONTACT_LINK}
                  >
                    {link.label}
                    <ExternalLink
                      aria-hidden
                      strokeWidth={1.5}
                      className="size-4 rtl:-scale-x-100"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-zsd-md border-t border-border py-zsd-md text-zsd-body-sm text-zsd-on-surface-muted">
          <p dir="ltr" className="flex items-center gap-zsd-sm">
            <span
              aria-hidden
              className="size-1.5 shrink-0 rotate-45 bg-zsd-primary"
            />
            © {new Date().getFullYear()} WebRunner
          </p>
          {/* To <main>, which takes the focus, like the skip link. */}
          <a
            href="#main"
            className={`inline-flex min-h-zsd-control-height items-center gap-zsd-xs hover:text-zsd-on-surface ${FOCUS_RING}`}
          >
            <ArrowUp aria-hidden strokeWidth={1.5} className="size-4" />
            {t("footer.top")}
          </a>
        </div>
      </div>
    </footer>
  )
}
