import type { ReactNode } from "react"
import { MapPin } from "lucide-react"

import type { CvForm, Profile } from "@contracts/api/public"
import { imageUrl } from "@contracts/media"
import { useT } from "@/shared/i18n"
import { FallbackNotice, fallbackLang } from "@/shared/ui/fallback-notice"

export const CV_LINK =
  "text-zsd-primary-text underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-ring"

const PHOTO_SIZE = 160

// On paper a link is only its text, so the Print CV spells the URL out.
const bareUrl = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")

function contacts(profile: Profile, form: CvForm) {
  const label = (name: string, url: string) =>
    form === "print" ? bareUrl(url) : name
  return [
    profile.email && {
      label: profile.email,
      href: `mailto:${profile.email}`,
    },
    profile.telegramUrl && {
      label: label("Telegram", profile.telegramUrl),
      href: profile.telegramUrl,
    },
    profile.linkedinUrl && {
      label: label("LinkedIn", profile.linkedinUrl),
      href: profile.linkedinUrl,
    },
    profile.githubUrl && {
      label: label("GitHub", profile.githubUrl),
      href: profile.githubUrl,
    },
  ].filter((link) => !!link)
}

// The CV header of both forms (CONTEXT.md › CV): name, headline and the
// Profile's contacts, never a phone. The Web CV adds the photo and the
// Fallback notice; the Print CV is denser and spells the links out.
// `actions` holds the CV PDF download.
export function CvHeader({
  profile,
  form = "web",
  actions,
}: {
  profile: Profile
  form?: CvForm
  actions?: ReactNode
}) {
  const t = useT()
  const links = contacts(profile, form)
  const web = form === "web"

  const place = profile.location && (
    <p
      lang={fallbackLang(profile)}
      className="flex items-center gap-zsd-xs text-zsd-body-sm text-zsd-on-surface-muted"
    >
      <MapPin aria-hidden="true" className="size-4 shrink-0" />
      {profile.location}
    </p>
  )
  const contactList = links.length > 0 && (
    <ul
      aria-label={t("cv.contacts")}
      className={`flex flex-wrap items-center gap-x-zsd-lg ${web ? "text-zsd-body-md" : "text-zsd-body-sm"}`}
    >
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            {...(link.href.startsWith("mailto:")
              ? {}
              : { target: "_blank", rel: "noreferrer" })}
            className={`break-all ${web ? "inline-flex min-h-zsd-control-height items-center" : ""} ${CV_LINK}`}
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  )

  return (
    <header
      className={
        web
          ? "flex flex-col gap-zsd-xl md:flex-row md:items-start"
          : "flex flex-col"
      }
    >
      {web && profile.photoKey && (
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
      <div
        className={`flex min-w-0 flex-1 flex-col ${web ? "gap-zsd-md" : "gap-zsd-xs"}`}
      >
        {web && <FallbackNotice fallback={profile.fallback} />}
        <div lang={fallbackLang(profile)}>
          <h1
            className={`font-heading break-words text-zsd-on-surface ${web ? "text-zsd-headline-md md:text-zsd-headline-lg" : "text-zsd-headline-md"}`}
          >
            {profile.name}
          </h1>
          <p
            className={`text-zsd-on-surface-muted ${web ? "mt-zsd-sm text-zsd-body-lg" : "text-zsd-body-md/snug"}`}
          >
            {profile.headline}
          </p>
          {web && place && <div className="mt-zsd-xs">{place}</div>}
        </div>
        {web
          ? contactList
          : (place || contactList) && (
              // Paper has room for one line: the place, then the contacts.
              <div className="flex flex-wrap items-center gap-x-zsd-lg">
                {place}
                {contactList}
              </div>
            )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  )
}
