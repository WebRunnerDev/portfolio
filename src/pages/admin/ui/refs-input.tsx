import { useId } from "react"

import { Checkbox, Label } from "@/shared/ui/kit"

import { listRows } from "../api/admin-api"
import { rowTitle } from "../lib/row"
import { findEntity } from "../model/entities"
import { useResource } from "../model/use-resource"

// Picks rows of another entity: a project's technologies. The ids keep the
// order of that entity's list.
export function RefsInput({
  entityPath,
  value,
  onChange,
}: {
  entityPath: string
  value: number[]
  onChange: (ids: number[]) => void
}) {
  const id = useId()
  const entity = findEntity(entityPath)!
  const rows = useResource(`ref:${entity.path}`, () =>
    listRows(entity.path, entity.schemas.entity)
  )

  if (rows.error) {
    return <p className="text-zsd-body-sm text-zsd-error">Couldn't load.</p>
  }
  if (!rows.data) {
    return <p className="text-zsd-body-sm text-muted-foreground">Loading…</p>
  }
  if (rows.data.length === 0) {
    return (
      <p className="text-zsd-body-sm text-muted-foreground">
        No {entity.label.toLowerCase()} yet.
      </p>
    )
  }

  const picked = new Set(value)
  const listed = rows.data
  function toggle(rowId: number, on: boolean) {
    if (on) picked.add(rowId)
    else picked.delete(rowId)
    onChange(listed.map((row) => row.id).filter((n) => picked.has(n)))
  }

  return (
    <ul className="flex flex-wrap gap-x-zsd-md gap-y-zsd-xs">
      {listed.map((row) => (
        <li key={row.id} className="flex items-center gap-zsd-xs">
          <Checkbox
            id={`${id}-${row.id}`}
            checked={picked.has(row.id)}
            onCheckedChange={(checked) => toggle(row.id, checked === true)}
          />
          <Label htmlFor={`${id}-${row.id}`}>{rowTitle(entity, row)}</Label>
        </li>
      ))}
    </ul>
  )
}
