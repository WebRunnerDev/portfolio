import { Fragment, type ReactNode } from "react"

import type { Profile } from "@contracts/api/public"
import { useT } from "@/shared/i18n"
import { fallbackLang } from "@/shared/ui/fallback-notice"

import { PRINT_LINK } from "./print-cv-sections"

// On paper a link is only its text, so the URL is spelled out.
const bareUrl = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")

// "https://t.me/WebRunner_dev" → "@WebRunner_dev".
const telegramHandle = (url: string) => `@${bareUrl(url).split("/").pop()}`

function Line({ items }: { items: ReactNode[] }) {
  const shown = items.filter(Boolean)
  if (shown.length === 0) return null
  return (
    <p>
      {shown.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="px-zsd-sm">|</span>}
          {item}
        </Fragment>
      ))}
    </p>
  )
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  const external = !href.startsWith("mailto:")
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={PRINT_LINK}
    >
      {children}
    </a>
  )
}

// The Print CV header, centred: name, headline, then two contact lines — the
// place, email and Telegram; LinkedIn, GitHub and this site. Never a phone
// (CONTEXT.md › Profile).
export function PrintCvHeader({ profile }: { profile: Profile }) {
  const t = useT()
  const site = window.location.origin
  return (
    <header className="flex flex-col items-center text-center">
      <div lang={fallbackLang(profile)}>
        <h1 className="font-heading text-zsd-headline-md font-semibold text-zsd-on-surface">
          {profile.name}
        </h1>
        <p className="text-zsd-body-lg/snug text-zsd-on-surface">
          {profile.headline}
        </p>
      </div>
      <address aria-label={t("cv.contacts")} className="not-italic">
        <Line
          items={[
            profile.location && (
              <span lang={fallbackLang(profile)}>{profile.location}</span>
            ),
            profile.email && (
              <Link href={`mailto:${profile.email}`}>{profile.email}</Link>
            ),
            profile.telegramUrl && (
              <Link href={profile.telegramUrl}>
                Telegram: {telegramHandle(profile.telegramUrl)}
              </Link>
            ),
          ]}
        />
        <Line
          items={[
            profile.linkedinUrl && (
              <Link href={profile.linkedinUrl}>
                {bareUrl(profile.linkedinUrl)}
              </Link>
            ),
            profile.githubUrl && (
              <Link href={profile.githubUrl}>{bareUrl(profile.githubUrl)}</Link>
            ),
            <Link href={site}>{bareUrl(site)}</Link>,
          ]}
        />
      </address>
    </header>
  )
}
