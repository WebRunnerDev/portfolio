import { Link } from "@tanstack/react-router"

import { ENTITIES } from "../model/entities"

export function AdminHomePage() {
  return (
    <>
      <h1 className="font-heading text-zsd-headline-md">Content</h1>
      <ul className="grid gap-zsd-sm sm:grid-cols-2 xl:grid-cols-3">
        {ENTITIES.map((entity) => (
          <li key={entity.path}>
            <Link
              to="/admin/$entity"
              params={{ entity: entity.path }}
              className="block border border-border bg-card px-zsd-md py-zsd-sm outline-offset-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              {entity.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/admin/cv-pdf"
            className="block border border-border bg-card px-zsd-md py-zsd-sm outline-offset-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            CV PDF
          </Link>
        </li>
      </ul>
    </>
  )
}
