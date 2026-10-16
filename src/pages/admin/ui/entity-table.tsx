import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowDown, ArrowUp } from "lucide-react"

import { imageUrl, mediaUrl } from "@contracts/media"
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/kit"

import { AdminApiError, reorderRows, type AdminRow } from "../api/admin-api"
import { cellText, fieldValue, rowTitle, translatedLangs } from "../lib/row"
import type { Column, EntityConfig } from "../model/entities"
import { ApiErrorNotice } from "./api-error-notice"
import { DeleteRowButton } from "./delete-row-button"

const DONE = new Set(["published", "completed"])

// Resized copies exist only on the zone (worker/README.md › Media).
function thumbnail(key: string) {
  return location.hostname === "webrunner.dev"
    ? imageUrl(key, 160)
    : mediaUrl(key)
}

function Cell({ row, column }: { row: AdminRow; column: Column }) {
  const value = fieldValue(row, column.field, column.translated)
  switch (column.kind) {
    case "flag":
      return value === true ? (
        "Yes"
      ) : (
        <span className="text-muted-foreground">No</span>
      )
    case "status":
      return value ? (
        <Badge variant={DONE.has(String(value)) ? "default" : "outline"}>
          {cellText(row, column)}
        </Badge>
      ) : null
    case "image":
      return typeof value === "string" ? (
        <img
          src={thumbnail(value)}
          alt=""
          loading="lazy"
          className="size-12 border border-border object-cover"
        />
      ) : null
    default:
      return <>{cellText(row, column)}</>
  }
}

// The rows of an entity: title linking to the editor, the columns of its
// config, Langs with a Translation, order and delete.
export function EntityTable({
  entity,
  rows,
  onChanged,
}: {
  entity: EntityConfig
  rows: AdminRow[]
  onChanged: () => void
}) {
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState<AdminApiError>()
  const orderable = entity.ordered && !entity.single

  async function move(index: number, by: -1 | 1) {
    const ids = rows.map((row) => row.id)
    ;[ids[index], ids[index + by]] = [ids[index + by], ids[index]]
    setMoving(true)
    setError(undefined)
    try {
      await reorderRows(entity.path, ids)
      onChanged()
    } catch (caught) {
      if (caught instanceof AdminApiError) setError(caught)
    } finally {
      setMoving(false)
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-zsd-body-md text-muted-foreground">
        No {entity.label.toLowerCase()} yet.
      </p>
    )
  }

  return (
    <>
      {error && <ApiErrorNotice error={error} />}
      <Table>
        <TableHeader>
          <TableRow>
            {orderable && <TableHead className="w-24">Order</TableHead>}
            <TableHead>Title</TableHead>
            {entity.columns.map((column) => (
              <TableHead key={column.field + column.label}>
                {column.label}
              </TableHead>
            ))}
            {entity.translated && <TableHead>Langs</TableHead>}
            {!entity.single && (
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const title = rowTitle(entity, row)
            return (
              <TableRow key={row.id}>
                {orderable && (
                  <TableCell>
                    <div className="flex items-center gap-zsd-xs">
                      <span className="w-6 text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Move ${title} up`}
                        disabled={moving || index === 0}
                        onClick={() => void move(index, -1)}
                      >
                        <ArrowUp aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Move ${title} down`}
                        disabled={moving || index === rows.length - 1}
                        onClick={() => void move(index, 1)}
                      >
                        <ArrowDown aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                )}
                <TableCell className="max-w-64 truncate font-medium">
                  <Link
                    to="/admin/$entity/$id"
                    params={{ entity: entity.path, id: String(row.id) }}
                    className="underline-offset-4 outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {title}
                  </Link>
                </TableCell>
                {entity.columns.map((column) => (
                  <TableCell key={column.field + column.label}>
                    <Cell row={row} column={column} />
                  </TableCell>
                ))}
                {entity.translated && (
                  <TableCell className="font-mono text-zsd-body-sm">
                    {translatedLangs(row).join(" ")}
                  </TableCell>
                )}
                {!entity.single && (
                  <TableCell className="text-end">
                    <DeleteRowButton
                      entity={entity}
                      id={row.id}
                      title={title}
                      onDeleted={onChanged}
                    />
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}
