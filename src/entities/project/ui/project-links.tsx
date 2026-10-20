import { ExternalLink } from "lucide-react"
import { cn } from "cn"

import type { Project } from "@contracts/api/public"
import { useT } from "@/shared/i18n"

// `relative z-10` lifts them above the stretched link of a card.
const LINK =
  "relative z-10 inline-flex min-h-zsd-control-height items-center gap-zsd-xs text-zsd-body-sm text-zsd-primary-text underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-ring"

function OutLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={LINK}>
      {children}
      <ExternalLink
        aria-hidden="true"
        strokeWidth={1.5}
        className="size-4 rtl:-scale-x-100"
      />
    </a>
  )
}

// A Project's GitHub and demo, each in a new tab; nothing without either.
export function ProjectLinks({
  project,
  className,
}: {
  project: Pick<Project, "githubUrl" | "demoUrl">
  className?: string
}) {
  const t = useT()
  if (!project.githubUrl && !project.demoUrl) return null

  return (
    <p className={cn("flex flex-wrap gap-x-zsd-lg", className)}>
      {project.githubUrl && <OutLink href={project.githubUrl}>GitHub</OutLink>}
      {project.demoUrl && (
        <OutLink href={project.demoUrl}>{t("project.demo")}</OutLink>
      )}
    </p>
  )
}
