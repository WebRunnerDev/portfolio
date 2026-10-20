import { Archive, CircleCheck, CircleDot } from "lucide-react"
import { cn } from "cn"

import type { Project } from "@contracts/api/public"
import { useT, type MessageKey } from "@/shared/i18n"

const STATUS: Record<
  Project["status"],
  { label: MessageKey; icon: typeof CircleDot }
> = {
  in_progress: { label: "project.status.in_progress", icon: CircleDot },
  completed: { label: "project.status.completed", icon: CircleCheck },
  archived: { label: "project.status.archived", icon: Archive },
}

// DESIGN.md › Badge: `badge-success` for an active project, the neutral badge
// otherwise; always the icon and the text, never the color alone.
export function ProjectStatus({ status }: { status: Project["status"] }) {
  const t = useT()
  const { label, icon: Icon } = STATUS[status]

  return (
    <span
      data-testid="project-status"
      className={cn(
        "inline-flex shrink-0 items-center gap-zsd-xs px-zsd-sm py-zsd-xs font-zsd-label-mono text-zsd-label-mono uppercase rtl:normal-case",
        status === "in_progress"
          ? "bg-zsd-success text-zsd-on-success"
          : "border border-zsd-outline-muted bg-zsd-surface text-zsd-on-surface-muted"
      )}
    >
      <Icon aria-hidden="true" strokeWidth={1.5} className="size-4" />
      {t(label)}
    </span>
  )
}
