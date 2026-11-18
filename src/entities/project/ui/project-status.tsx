import { Archive, CircleCheck } from "lucide-react"
import { cn } from "cn"

import type { Project } from "@contracts/api/public"
import { useT, type MessageKey } from "@/shared/i18n"

const STATUS: Record<
  Project["status"],
  { label: MessageKey; icon: typeof CircleCheck | null }
> = {
  in_progress: { label: "project.status.in_progress", icon: null },
  completed: { label: "project.status.completed", icon: CircleCheck },
  archived: { label: "project.status.archived", icon: Archive },
}

// DESIGN.md › Badge: `badge-active` for an active project, a rust outline
// with a breathing tile (`status-tile` in index.css) in place of an icon; the
// neutral badge otherwise, with its icon. Both the same size, so they read as
// a pair; always with the text, never the color alone.
export function ProjectStatus({ status }: { status: Project["status"] }) {
  const t = useT()
  const { label, icon: Icon } = STATUS[status]

  return (
    <span
      data-testid="project-status"
      className={cn(
        "inline-flex shrink-0 items-center gap-zsd-xs border bg-zsd-surface px-zsd-sm py-zsd-xs font-zsd-label-mono text-zsd-label-mono uppercase rtl:normal-case",
        status === "in_progress"
          ? "border-zsd-primary text-zsd-primary-text"
          : "border-zsd-outline-muted text-zsd-on-surface-muted"
      )}
    >
      {Icon ? (
        <Icon aria-hidden="true" strokeWidth={1.5} className="size-4" />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-4 shrink-0 place-items-center"
        >
          <span data-testid="status-tile" className="status-tile" />
        </span>
      )}
      {t(label)}
    </span>
  )
}
