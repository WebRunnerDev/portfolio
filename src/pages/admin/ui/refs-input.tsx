import { useId, useState, type KeyboardEvent } from "react"

import { Button, Checkbox, Input, Label } from "@/shared/ui/kit"

import { createRow, listRows } from "../api/admin-api"
import { buildBody, otherErrors, validateBody } from "../lib/form"
import { rowTitle } from "../lib/row"
import { findEntity, type EntityConfig } from "../model/entities"
import { useResource } from "../model/use-resource"
import { useSaving } from "./use-saving"

// Picks rows of another entity: a project's technologies. The ids keep the
// order of that entity's list. `addable`: a new row (a post's tag) is created
// below the list and picked at once.
export function RefsInput({
  entityPath,
  addable,
  value,
  onChange,
}: {
  entityPath: string
  addable?: boolean
  value: number[]
  onChange: (ids: number[]) => void
}) {
  const id = useId()
  const entity = findEntity(entityPath)!
  const rows = useResource(`ref:${entity.path}`, () =>
    listRows(entity.path, entity.schemas.entity)
  )

  const add = addable && (
    <AddRow
      entity={entity}
      onCreated={(rowId) => {
        rows.reload()
        onChange([...value, rowId])
      }}
    />
  )

  if (rows.error) {
    return <p className="text-zsd-body-sm text-zsd-error">Couldn't load.</p>
  }
  if (!rows.data) {
    return <p className="text-zsd-body-sm text-muted-foreground">Loading…</p>
  }
  if (rows.data.length === 0) {
    return (
      <>
        <p className="text-zsd-body-sm text-muted-foreground">
          No {entity.label.toLowerCase()} yet.
        </p>
        {add}
      </>
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
    <>
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
      {add}
    </>
  )
}

// "Cloud Native" → "cloud-native"; empty for a name in another script.
function slugOf(name: string) {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// The create fields of a plain entity (a tag's name and slug) inside the
// editor's form: no <form> of its own, Enter adds rather than saves.
function AddRow({
  entity,
  onCreated,
}: {
  entity: EntityConfig
  onCreated: (id: number) => void
}) {
  const id = useId()
  const [values, setValues] = useState<Record<string, string>>({})
  // The slug follows the name until it is typed itself.
  const [slugTyped, setSlugTyped] = useState(false)
  const saving = useSaving()
  const fields = entity.createFields
  const slug = fields.find((field) => field.kind === "slug")?.name
  const name = fields.find((field) => field.kind === "text")?.name
  const leftover = otherErrors(fields, saving.errors)

  function change(field: string, next: string) {
    setValues((current) => ({
      ...current,
      [field]: next,
      ...(slug && field === name && !slugTyped ? { [slug]: slugOf(next) } : {}),
    }))
    if (field === slug) setSlugTyped(next !== "")
  }

  function add() {
    const body = buildBody(entity, values)
    void saving.save(validateBody(entity, body), async () => {
      const row = await createRow(entity.path, entity.schemas.entity, body)
      setValues({})
      setSlugTyped(false)
      onCreated(row.id)
    })
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter") return
    event.preventDefault()
    add()
  }

  return (
    <div
      role="group"
      aria-labelledby={`${id}-title`}
      className="mt-zsd-xs flex flex-col gap-zsd-xs"
    >
      <p id={`${id}-title`} className="text-zsd-body-sm text-muted-foreground">
        New {entity.singular}
      </p>
      <div className="flex flex-wrap items-start gap-zsd-sm">
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-zsd-xs">
            <Label htmlFor={`${id}-${field.name}`} className="sr-only">
              New {entity.singular} {field.label.toLowerCase()}
            </Label>
            <Input
              id={`${id}-${field.name}`}
              placeholder={field.label}
              className="w-44"
              aria-invalid={!!saving.errors[field.name] || undefined}
              aria-describedby={`${id}-${field.name}-errors`}
              value={values[field.name] ?? ""}
              onChange={(event) => change(field.name, event.target.value)}
              onKeyDown={onKeyDown}
            />
            <div id={`${id}-${field.name}-errors`}>
              {saving.errors[field.name]?.map((message) => (
                <p key={message} className="text-zsd-body-sm text-zsd-error">
                  {message}
                </p>
              ))}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={saving.pending}
          onClick={add}
        >
          {saving.pending ? "Adding…" : `Add ${entity.singular}`}
        </Button>
      </div>
      {(saving.failure || leftover.length > 0) && (
        <div role="alert" className="text-zsd-body-sm text-zsd-error">
          {saving.failure && <p>{saving.failure}</p>}
          {leftover.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </div>
  )
}
