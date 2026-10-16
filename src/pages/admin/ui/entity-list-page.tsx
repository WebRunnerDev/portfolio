import { useId, useState } from "react"
import { getRouteApi } from "@tanstack/react-router"

import { Label } from "@/shared/ui/kit"

import {
  AdminApiError,
  getRow,
  listRows,
  type AdminRow,
} from "../api/admin-api"
import { findEntity, type EntityConfig } from "../model/entities"
import { useResource } from "../model/use-resource"
import { ApiErrorNotice } from "./api-error-notice"
import { CreateDialog } from "./create-dialog"
import { EntityTable } from "./entity-table"
import { RefSelect } from "./ref-select"
import { UnknownEntity } from "./unknown-entity"

const route = getRouteApi("/admin/$entity/")

// The Profile is one record: 404 until it's created, then a one-row list.
async function loadRows(
  entity: EntityConfig,
  scopeId: string
): Promise<AdminRow[]> {
  if (!entity.single) {
    const query =
      entity.scope && scopeId ? { [entity.scope.field]: scopeId } : undefined
    return listRows(entity.path, entity.schemas.entity, query)
  }
  try {
    return [await getRow(entity.path, entity.schemas.entity)]
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) {
      return []
    }
    throw error
  }
}

export function EntityListPage() {
  const { entity: path } = route.useParams()
  const entity = findEntity(path)
  if (!entity) return <UnknownEntity path={path} />
  // A fresh state (scope, dialogs) per entity.
  return <EntityList key={entity.path} entity={entity} />
}

function EntityList({ entity }: { entity: EntityConfig }) {
  const scopeLabelId = useId()
  const [scopeId, setScopeId] = useState("")
  const rows = useResource(`${entity.path}?${scopeId}`, () =>
    loadRows(entity, scopeId)
  )
  // Positions count within a scope: an album's photos are ordered among
  // themselves, so the order buttons show only for one album.
  const listed =
    entity.scope && !scopeId ? { ...entity, ordered: false } : entity
  const canCreate = !entity.single || rows.data?.length === 0
  const scopeEntity = entity.scope && findEntity(entity.scope.entity)

  return (
    <>
      <div className="flex flex-wrap items-center gap-zsd-md">
        <h1 className="me-auto font-heading text-zsd-headline-md">
          {entity.label}
        </h1>
        {canCreate && !(entity.single && rows.loading) && (
          <CreateDialog
            entity={entity}
            preset={
              entity.scope && scopeId
                ? { [entity.scope.field]: scopeId }
                : undefined
            }
            onCreated={rows.reload}
          />
        )}
      </div>
      {entity.scope && scopeEntity && (
        <div className="flex max-w-sm flex-col gap-zsd-xs">
          <Label htmlFor={scopeLabelId}>{entity.scope.label}</Label>
          <RefSelect
            id={scopeLabelId}
            entityPath={scopeEntity.path}
            value={scopeId}
            placeholder={`All ${scopeEntity.label.toLowerCase()}`}
            onChange={setScopeId}
          />
        </div>
      )}
      {rows.error && (
        <ApiErrorNotice error={rows.error} onRetry={rows.reload} />
      )}
      {rows.data ? (
        <div aria-busy={rows.loading} className="min-w-0 overflow-x-auto">
          <EntityTable
            entity={listed}
            rows={rows.data}
            onChanged={rows.reload}
          />
        </div>
      ) : (
        rows.loading && (
          <p role="status" className="text-zsd-body-md text-muted-foreground">
            Loading…
          </p>
        )
      )}
    </>
  )
}
