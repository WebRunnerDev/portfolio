import { useT } from "@/shared/i18n"
import { PageStub } from "@/shared/ui/page-stub"

export function GalleryPage() {
  const t = useT()

  return (
    <PageStub title={t("nav.gallery")}>
      <p>{t("stub.soon")}</p>
    </PageStub>
  )
}
