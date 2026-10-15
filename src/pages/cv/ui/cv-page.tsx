import { useT } from "@/shared/i18n"
import { PageStub } from "@/shared/ui/page-stub"

export function CvPage() {
  const t = useT()

  return (
    <PageStub title={t("nav.cv")}>
      <p>{t("stub.soon")}</p>
    </PageStub>
  )
}
