import { getRouteApi, Link } from "@tanstack/react-router"

import { getRow } from "../api/admin-api"
import { rowTitle, translatedLangs } from "../lib/row"
import { findEntity, type EntityConfig } from "../model/entities"
import { useResource } from "../model/use-resource"
import { ApiErrorNotice } from "./api-error-notice"
import { UnknownEntity } from "./unknown-entity"

const route = getRouteApi("/admin/$entity/$id")

function show(value: unknown) {
  if (value === null || value === undefined || value === "") return "–"
  if (Array.isArray(value)) return value.length ? value.join(", ") : "–"
  return String(value)
}

export function EntityEditorPage() {
  const { entity: path, id } = route.useParams()
  const entity = findEntity(path)
  if (!entity || !/^[1-9]\d*$/.test(id)) return <UnknownEntity path={path} />
  return <EntityEditor key={`${path}/${id}`} entity={entity} id={id} />
}

// The record as stored. Editing it (fields and Translations by Lang) comes
// with the shared editor (#35).
function EntityEditor({ entity, id }: { entity: EntityConfig; id: string }) {
  const row = useResource(`${entity.path}/${id}`, () =>
    getRow(
      entity.single ? entity.path : `${entity.path}/${id}`,
      entity.schemas.entity
    )
  )
  const fields = Object.entries(row.data ?? {}).filter(
    ([name]) => name !== "id" && name !== "translations"
  )

  return (
    <>
      <Link
        to="/admin/$entity"
        params={{ entity: entity.path }}
        className="text-zsd-body-sm underline-offset-4 hover:underline"
      >
        {entity.label}
      </Link>
      {row.error && <ApiErrorNotice error={row.error} onRetry={row.reload} />}
      {row.loading && (
        <p role="status" className="text-zsd-body-md text-muted-foreground">
          Loading…
        </p>
      )}
      {row.data && (
        <>
          <h1 className="font-heading text-zsd-headline-md break-words">
            {rowTitle(entity, row.data)}
          </h1>
          <p className="text-zsd-body-md text-muted-foreground">
            Editing lands with the translation editor.
          </p>
          <dl className="grid max-w-2xl grid-cols-[auto_1fr] gap-x-zsd-lg gap-y-zsd-xs text-zsd-body-sm">
            {fields.map(([name, value]) => (
              <div key={name} className="contents">
                <dt className="text-muted-foreground">{name}</dt>
                <dd className="min-w-0 break-words">{show(value)}</dd>
              </div>
            ))}
            {entity.translated && (
              <div className="contents">
                <dt className="text-muted-foreground">Langs</dt>
                <dd className="font-mono">{show(translatedLangs(row.data))}</dd>
              </div>
            )}
          </dl>
        </>
      )}
    </>
  )
}
