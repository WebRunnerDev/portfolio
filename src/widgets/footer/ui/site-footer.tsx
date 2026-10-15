import { Check, Copy } from "lucide-react"

import { useT } from "@/shared/i18n"
import { Button } from "@/shared/ui/kit"

import { useCopy } from "../lib/use-copy"
import { CONTACT_LINKS, EMAIL } from "../model/contacts"

const LINK =
  "text-zsd-primary-text underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-ring"

// Contacts on every page, so there is no contacts page. The copy result shows
// next to the button and is announced through the status region.
export function SiteFooter() {
  const t = useT()
  const { state, copy } = useCopy()

  return (
    <footer className="border-t border-border [view-transition-name:site-footer]">
      <div className="mx-auto flex max-w-(--zsd-x-zsd-layout-content-max) flex-wrap items-center justify-between gap-zsd-lg px-zsd-lg py-zsd-xl text-zsd-body-sm text-zsd-on-surface-muted md:px-zsd-xxl">
        <ul
          aria-label={t("footer.contacts")}
          className="flex flex-wrap items-center gap-x-zsd-lg gap-y-zsd-sm"
        >
          <li className="flex items-center gap-zsd-xs">
            <a href={`mailto:${EMAIL}`} className={`break-all ${LINK}`}>
              {EMAIL}
            </a>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("footer.copyEmail")}
              title={t("footer.copyEmail")}
              onClick={() => copy(EMAIL)}
            >
              {state === "copied" ? (
                <Check aria-hidden />
              ) : (
                <Copy aria-hidden />
              )}
            </Button>
            <span role="status" className="text-zsd-label-md">
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
                className={LINK}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <p dir="ltr">© {new Date().getFullYear()} WebRunner</p>
      </div>
    </footer>
  )
}
