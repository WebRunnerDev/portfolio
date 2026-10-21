import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/kit"

import type { AdminRow } from "../api/admin-api"
import { rowTitle } from "../lib/row"
import { thumbnail } from "../lib/thumbnail"
import type { EntityConfig } from "../model/entities"

export type Gallery = { entity: EntityConfig; rows: AdminRow[] | undefined }

// Picks the file of one of the gallery's rows (an album's cover among its
// photos). Pressing the chosen one again leaves none chosen.
export function CoverInput({
  gallery,
  value,
  onChange,
}: {
  gallery: Gallery | undefined
  value: string
  onChange: (value: string) => void
}) {
  const file = gallery?.entity.fields.find((field) => field.kind === "file")
  if (!gallery?.rows || !file) {
    return <p className="text-zsd-body-sm text-muted-foreground">Loading…</p>
  }
  if (gallery.rows.length === 0) {
    return (
      <p className="text-zsd-body-sm text-muted-foreground">
        Add {gallery.entity.label.toLowerCase()} first.
      </p>
    )
  }
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={1}
      value={value}
      onValueChange={onChange}
      className="flex-wrap"
    >
      {gallery.rows.map((row) => {
        const key = String(row[file.name])
        return (
          <ToggleGroupItem
            key={row.id}
            value={key}
            aria-label={rowTitle(gallery.entity, row)}
            className="size-16 p-0.5 data-[state=on]:ring-2 data-[state=on]:ring-primary"
          >
            <img
              src={thumbnail(key)}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
