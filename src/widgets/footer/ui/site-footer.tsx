import { ArrowUp, Check, Copy, ExternalLink } from "lucide-react"

import { useT } from "@/shared/i18n"
import { Button } from "@/shared/ui/kit"
import { Reveal, RevealText } from "@/shared/ui/reveal"

import { useCopy } from "../lib/use-copy"
import { CONTACT_LINKS, EMAIL } from "../model/contacts"

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"

const HOVER = "duration-(--zsd-x-zsd-motion-duration-fast) ease-zsd-hover"

// From `lg`, where the contacts start: the line of the hero's subtitle and of
// the home chapters' content, a quarter of the content box in
// (CONTENT_START in src/pages/home), so the page's offset runs to its end.
const CONTENT_START =
  "lg:ms-[calc((100%-3*var(--zsd-spacing-xxl))/4+var(--zsd-spacing-xxl))]"

// The contact section closing every page (docs/design-brief.md › Footer), so
// there is no contacts page: a label, a large title ended by a rust tile as
// its full stop, the email as the main link, then a row for each other
// contact (its name, where it leads, the external link icon), and the
// copyright and a way back up. From `lg` the email and the rows stand on the
// line of the home chapters' content. A row's name moves past a tile in the
// reading direction on hover and focus, the tile showing where it stood, as
// in the menu. Its blocks rise once it enters the viewport. The copy result shows
// next to the button and is announced through the status region.
export function SiteFooter() {
  const t = useT()
  const { state, copy } = useCopy()

  return (
    <footer className="border-t border-border [view-transition-name:site-footer]">
      <div className="mx-auto max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg md:px-zsd-xxl">
        <div className="pt-zsd-section pb-zsd-section lg:pt-zsd-section-lg">
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
            after={
              <span
                aria-hidden="true"
                className="ms-[0.12em] me-[0.05em] mb-[0.05em] inline-block size-[0.2em] reveal-stop bg-zsd-primary"
              />
            }
          />
          <Reveal
            order={1}
            className={`mt-zsd-xl lg:mt-zsd-xxl ${CONTENT_START}`}
          >
            <ul aria-labelledby="footer-contacts">
              <li className="mb-zsd-xl flex flex-wrap items-center gap-x-zsd-sm">
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
                <li
                  key={link.label}
                  className="border-t border-zsd-outline-muted last:border-b"
                >
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`group/contact grid min-h-14 grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_auto] items-center gap-x-zsd-lg py-zsd-sm sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] ${FOCUS_RING}`}
                  >
                    <span className="relative flex items-center">
                      <span
                        aria-hidden="true"
                        className={`absolute inset-s-0 size-1.5 rotate-45 bg-zsd-primary opacity-0 transition-opacity ${HOVER} group-hover/contact:opacity-100 group-focus-visible/contact:opacity-100 motion-reduce:transition-none`}
                      />
                      <span
                        className={`font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface uppercase transition-[translate,color] ${HOVER} group-hover/contact:translate-x-4 group-hover/contact:text-zsd-primary-text group-focus-visible/contact:translate-x-4 motion-reduce:transition-none rtl:group-hover/contact:-translate-x-4 rtl:group-focus-visible/contact:-translate-x-4`}
                      >
                        {link.label}
                      </span>
                    </span>
                    <span className="truncate text-zsd-body-sm text-zsd-on-surface-muted">
                      <span dir="ltr">{link.handle}</span>
                    </span>
                    <ExternalLink
                      aria-hidden
                      strokeWidth={1.5}
                      className={`size-4 text-zsd-on-surface-muted transition-[translate,color] ${HOVER} group-hover/contact:-translate-y-0.5 group-hover/contact:text-zsd-on-surface group-focus-visible/contact:-translate-y-0.5 motion-reduce:transition-none rtl:-scale-x-100`}
                    />
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        {/* Room at the bottom for the music player's button over the corner. */}
        <div className="flex flex-wrap items-center justify-between gap-zsd-md border-t border-border pt-zsd-md pb-[calc(var(--zsd-spacing-control-height)+var(--zsd-spacing-xl))] text-zsd-body-sm text-zsd-on-surface-muted">
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
            className={`group/top inline-flex min-h-zsd-control-height items-center gap-zsd-xs transition-colors ${HOVER} hover:text-zsd-on-surface motion-reduce:transition-none ${FOCUS_RING}`}
          >
            <ArrowUp
              aria-hidden
              strokeWidth={1.5}
              className={`size-4 transition-[translate] ${HOVER} group-hover/top:-translate-y-0.5 group-focus-visible/top:-translate-y-0.5 motion-reduce:transition-none`}
            />
            {t("footer.top")}
          </a>
        </div>
      </div>
    </footer>
  )
}
