import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import type { SectionItem } from "../model/sections"

// A link to an item of SECTIONS: an entity's list or a page of its own.
export function SectionLink({
  item,
  className,
  activeClassName,
  children,
}: {
  item: SectionItem
  className: string
  // Set: the link shows where the Admin is (the nav).
  activeClassName?: string
  children?: ReactNode
}) {
  const activeProps = activeClassName
    ? { className: activeClassName, "aria-current": "page" as const }
    : undefined
  const content = children ?? item.label
  return item.kind === "entity" ? (
    <Link
      to="/admin/$entity"
      params={{ entity: item.entity.path }}
      className={className}
      activeProps={activeProps}
    >
      {content}
    </Link>
  ) : (
    <Link to="/admin/cv-pdf" className={className} activeProps={activeProps}>
      {content}
    </Link>
  )
}
