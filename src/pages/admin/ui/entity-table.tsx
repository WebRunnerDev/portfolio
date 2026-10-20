import { useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

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
import { cn } from "@/shared/lib/utils"

import { AdminApiError, reorderRows, type AdminRow } from "../api/admin-api"
import { cellText, fieldValue, rowTitle, translatedLangs } from "../lib/row"
import { thumbnail } from "../lib/thumbnail"
import type { Column, EntityConfig } from "../model/entities"
import { ApiErrorNotice } from "./api-error-notice"
import { DeleteRowButton } from "./delete-row-button"

const DONE = new Set(["published", "completed"])

// Rows move up and down only.
const vertical: Modifier = ({ transform }) => ({ ...transform, x: 0 })

const INSTRUCTIONS = {
  draggable:
    "Press Space to pick the row up, the arrow keys to move it, Space again to drop it, Escape to cancel.",
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
// config, Langs with a Translation, order and delete. An ordered entity's
// rows are dragged by their handle, with the mouse or the keyboard; the new
// order is saved at once (PUT /order).
export function EntityTable({
  entity,
  rows,
  onChanged,
}: {
  entity: EntityConfig
  rows: AdminRow[]
  onChanged: () => void
}) {
  // The order just dropped, for `rows` as they were: it shows while it is
  // saved and the list reloads, then the new `rows` take over.
  const [moved, setMoved] = useState<{ rows: AdminRow[]; ids: number[] }>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<AdminApiError>()
  const orderable = entity.ordered && !entity.single
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const byId = new Map(rows.map((row) => [row.id, row]))
  const shown =
    moved?.rows === rows ? moved.ids.map((id) => byId.get(id)!) : rows
  const ids = shown.map((row) => row.id)

  const title = (id: UniqueIdentifier) => {
    const row = byId.get(Number(id))
    return row ? rowTitle(entity, row) : String(id)
  }
  const place = (id: UniqueIdentifier | undefined) =>
    id === undefined ? 0 : ids.indexOf(Number(id)) + 1
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${title(active.id)}, position ${place(active.id)} of ${ids.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${title(active.id)} is now at position ${place(over.id)} of ${ids.length}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      `Dropped ${title(active.id)} at position ${place(over?.id ?? active.id)} of ${ids.length}.`,
    onDragCancel: ({ active }) =>
      `Moving ${title(active.id)} was cancelled. It stays at position ${place(active.id)}.`,
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const next = arrayMove(
      ids,
      ids.indexOf(Number(active.id)),
      ids.indexOf(Number(over.id))
    )
    setMoved({ rows, ids: next })
    setSaving(true)
    setError(undefined)
    try {
      await reorderRows(entity.path, next)
      onChanged()
    } catch (caught) {
      setMoved(undefined)
      if (caught instanceof AdminApiError) setError(caught)
    } finally {
      setSaving(false)
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-zsd-body-md text-muted-foreground">
        No {entity.label.toLowerCase()} yet.
      </p>
    )
  }

  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          {orderable && <TableHead className="w-20">Order</TableHead>}
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
      <TableBody aria-busy={saving || undefined}>
        {shown.map((row, index) => {
          const rowName = rowTitle(entity, row)
          const cells = (
            <>
              <TableCell className="max-w-64 truncate font-medium">
                <Link
                  to="/admin/$entity/$id"
                  params={{ entity: entity.path, id: String(row.id) }}
                  className="underline-offset-4 outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {rowName}
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
                    title={rowName}
                    onDeleted={onChanged}
                  />
                </TableCell>
              )}
            </>
          )
          return orderable ? (
            <SortableRow
              key={row.id}
              id={row.id}
              title={rowName}
              place={index + 1}
              disabled={saving}
            >
              {cells}
            </SortableRow>
          ) : (
            <TableRow key={row.id}>{cells}</TableRow>
          )
        })}
      </TableBody>
    </Table>
  )

  return (
    <>
      {error && <ApiErrorNotice error={error} />}
      {orderable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[vertical]}
          accessibility={{
            announcements,
            screenReaderInstructions: INSTRUCTIONS,
          }}
          onDragEnd={(event) => void onDragEnd(event)}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {table}
          </SortableContext>
        </DndContext>
      ) : (
        table
      )}
    </>
  )
}

// A row with its position and the handle that drags it.
function SortableRow({
  id,
  title,
  place,
  disabled,
  children,
}: {
  id: number
  title: string
  place: number
  disabled: boolean
  children: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  return (
    <TableRow
      ref={setNodeRef}
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 bg-muted")}
    >
      <TableCell>
        <div className="flex items-center gap-zsd-xs">
          <Button
            ref={setActivatorNodeRef}
            variant="ghost"
            size="icon-xs"
            aria-label={`Move ${title}`}
            className="cursor-grab touch-none active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden />
          </Button>
          <span className="w-6 text-muted-foreground tabular-nums">
            {place}
          </span>
        </div>
      </TableCell>
      {children}
    </TableRow>
  )
}
