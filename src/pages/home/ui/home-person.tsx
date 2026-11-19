import { use } from "react"

import type { Profile } from "@contracts/api/public"
import { homePerson, jsonLd, personMeta } from "@contracts/meta"
import { useLang } from "@/shared/i18n"

// The owner as schema.org `Person` (contracts/meta.ts › homePerson), once the
// Profile arrives. Client only: the Worker leaves the home page without a D1
// read (worker/README.md › JSON-LD), and Google reads the rendered page.
export function HomePerson({ profile }: { profile: Promise<Profile | null> }) {
  const value = use(profile)
  const lang = useLang()
  if (!value) return null
  const data = homePerson(window.location.origin, lang, personMeta(value))
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  )
}
