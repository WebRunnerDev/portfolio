import { Link } from "@tanstack/react-router"

import { findItem } from "../model/sections"
import { SectionLink } from "./section-link"

const LINK =
  "underline-offset-4 outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"

function Separator() {
  return <li aria-hidden>›</li>
}

// Where the page at /admin/<path> is: Admin › its section, and on an editor
// (`editor`) its list a step up. The page's own name is its heading.
export function Breadcrumbs({
  path,
  editor,
}: {
  path: string
  editor?: boolean
}) {
  const found = findItem(path)
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-zsd-xs text-zsd-body-sm text-muted-foreground">
        <li>
          <Link to="/admin" className={LINK}>
            Admin
          </Link>
        </li>
        {found?.section.label && (
          <>
            <Separator />
            <li>
              <Link to="/admin" hash={found.section.id} className={LINK}>
                {found.section.label}
              </Link>
            </li>
          </>
        )}
        {found && editor && (
          <>
            <Separator />
            <li>
              <SectionLink
                item={found.item}
                className={`text-foreground ${LINK}`}
              />
            </li>
          </>
        )}
      </ol>
    </nav>
  )
}
