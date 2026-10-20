import { cn } from "cn"

import type { Technology } from "@contracts/api/public"

// DESIGN.md › Badge: technology tags with an `outline-muted` border.
export function ProjectTechnologies({
  technologies,
  className,
}: {
  technologies: Technology[]
  className?: string
}) {
  if (technologies.length === 0) return null

  return (
    <ul className={cn("flex flex-wrap gap-zsd-xs", className)}>
      {technologies.map((tech) => (
        <li
          key={tech.id}
          className="border border-zsd-outline-muted bg-zsd-surface px-zsd-sm py-zsd-xs font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase rtl:normal-case"
        >
          {tech.name}
        </li>
      ))}
    </ul>
  )
}
