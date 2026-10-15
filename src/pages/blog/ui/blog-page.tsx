import { useT } from "@/shared/i18n"
import { PageStub } from "@/shared/ui/page-stub"

export function BlogPage() {
  const t = useT()

  return (
    <PageStub title={t("nav.blog")}>
      <p>{t("stub.soon")}</p>
    </PageStub>
  )
}
