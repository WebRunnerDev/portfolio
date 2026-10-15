import { useT } from "@/shared/i18n"
import { PageStub } from "@/shared/ui/page-stub"

export function ProjectsPage() {
  const t = useT()

  return (
    <PageStub title={t("nav.projects")}>
      <p>{t("stub.soon")}</p>
    </PageStub>
  )
}
