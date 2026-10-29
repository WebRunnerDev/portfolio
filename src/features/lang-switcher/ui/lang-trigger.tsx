import type { ComponentProps } from "react"

import { useLang, useT } from "@/shared/i18n"
import { BarButton } from "@/shared/ui/bar-button"

import { LANG_NAMES } from "../model/lang-names"

// The current Lang's code and a chevron that turns over while the menu is
// open. The name holds the code shown (WCAG 2.5.3). The stand-in while the
// menu loads, then its trigger, so the header doesn't shift.
export function LangTrigger(props: ComponentProps<typeof BarButton>) {
  const lang = useLang()
  const t = useT()

  return (
    <BarButton
      aria-label={`${t("langSwitcher.label")}: ${lang.toUpperCase()}`}
      title={LANG_NAMES[lang]}
      className="gap-zsd-xs"
      {...props}
    >
      {lang}
      <svg
        viewBox="0 0 10 10"
        aria-hidden
        className="size-2.5 transition-transform duration-(--zsd-x-zsd-motion-duration-base) ease-zsd-enter group-aria-expanded/button:rotate-180 motion-reduce:transition-none"
      >
        <path
          d="M2 3.5L5 6.5L8 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </BarButton>
  )
}
