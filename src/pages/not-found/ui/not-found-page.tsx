import { Link } from "@tanstack/react-router"

import { useLang, useT } from "@/shared/i18n"
import { PageStub } from "@/shared/ui/page-stub"

// Rendered by the `/$lang` layout for any path it has no route for.
export function NotFoundPage() {
  const lang = useLang()
  const t = useT()

  return (
    <PageStub title={t("notFound.title")}>
      <meta name="robots" content="noindex" />
      <p>{t("notFound.text")}</p>
      <p className="mt-zsd-md">
        <Link
          to="/$lang"
          params={{ lang }}
          className="text-zsd-primary-text underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t("notFound.home")}
        </Link>
      </p>
    </PageStub>
  )
}
