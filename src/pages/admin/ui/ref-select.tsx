import type { ComponentProps } from "react"

import { NativeSelect, NativeSelectOption } from "@/shared/ui/kit"

import { listRows } from "../api/admin-api"
import { rowTitle } from "../lib/row"
import { findEntity } from "../model/entities"
import { useResource } from "../model/use-resource"

// Picks a row of another entity by id: a photo's album.
export function RefSelect({
  entityPath,
  value,
  onChange,
  placeholder = "Choose…",
  ...props
}: Omit<ComponentProps<"select">, "onChange" | "value" | "size"> & {
  entityPath: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const entity = findEntity(entityPath)!
  const rows = useResource(`ref:${entity.path}`, () =>
    listRows(entity.path, entity.schemas.entity)
  )

  return (
    <NativeSelect
      {...props}
      className="w-full"
      value={value}
      disabled={rows.loading && !rows.data}
      onChange={(event) => onChange(event.target.value)}
    >
      <NativeSelectOption value="">
        {rows.error ? "Couldn't load the list" : placeholder}
      </NativeSelectOption>
      {rows.data?.map((row) => (
        <NativeSelectOption key={row.id} value={String(row.id)}>
          {rowTitle(entity, row)}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
