import { useT } from "@/shared/i18n"
import { PageStub } from "@/shared/ui/page-stub"

export function ContactsPage() {
  const t = useT()

  return (
    <PageStub title={t("nav.contacts")}>
      <p>{t("stub.soon")}</p>
    </PageStub>
  )
}
