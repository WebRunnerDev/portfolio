import type { ReactNode } from "react"
import { MapPin } from "lucide-react"

import type { Profile } from "@contracts/api/public"
import { imageUrl } from "@contracts/media"
import { useT } from "@/shared/i18n"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"

export const CV_LINK =
  "text-zsd-primary-text underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-ring"

const PHOTO_SIZE = 160

function contacts(profile: Profile) {
  return [
    profile.email && {
      label: profile.email,
      href: `mailto:${profile.email}`,
    },
    profile.telegramUrl && { label: "Telegram", href: profile.telegramUrl },
    profile.linkedinUrl && { label: "LinkedIn", href: profile.linkedinUrl },
    profile.githubUrl && { label: "GitHub", href: profile.githubUrl },
  ].filter((link) => !!link)
}

// The CV header of both forms (CONTEXT.md › CV): name, headline and the
// Profile's contacts, never a phone. `photo` only on the Web CV; `actions`
// holds the CV PDF download.
export function CvHeader({
  profile,
  photo = false,
  actions,
}: {
  profile: Profile
  photo?: boolean
  actions?: ReactNode
}) {
  const t = useT()
  const links = contacts(profile)

  return (
    <header className="flex flex-col gap-zsd-xl md:flex-row md:items-start">
      {photo && profile.photoKey && (
        <img
          src={imageUrl(profile.photoKey, PHOTO_SIZE)}
          srcSet={`${imageUrl(profile.photoKey, PHOTO_SIZE * 2)} 2x`}
          width={PHOTO_SIZE}
          height={PHOTO_SIZE}
          alt={profile.name}
          fetchPriority="high"
          className="size-32 shrink-0 border border-zsd-outline-muted object-cover md:size-40"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-zsd-md">
        <FallbackNotice fallback={profile.fallback} />
        <div lang={fallbackLang(profile)}>
          <h1 className="font-heading text-zsd-headline-md break-words text-zsd-on-surface md:text-zsd-headline-lg">
            {profile.name}
          </h1>
          <p className="mt-zsd-sm text-zsd-body-lg text-zsd-on-surface-muted">
            {profile.headline}
          </p>
          {profile.location && (
            <p className="mt-zsd-xs flex items-center gap-zsd-xs text-zsd-body-sm text-zsd-on-surface-muted">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              {profile.location}
            </p>
          )}
        </div>
        {links.length > 0 && (
          <ul
            aria-label={t("cv.contacts")}
            className="flex flex-wrap items-center gap-x-zsd-lg text-zsd-body-md"
          >
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  {...(link.href.startsWith("mailto:")
                    ? {}
                    : { target: "_blank", rel: "noreferrer" })}
                  className={`inline-flex min-h-zsd-control-height items-center break-all ${CV_LINK}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  )
}
