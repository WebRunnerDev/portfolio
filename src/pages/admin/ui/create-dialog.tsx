import { useRef, useState, type FormEvent } from "react"
import { Plus } from "lucide-react"

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/kit"

import {
  AdminApiError,
  createRow,
  deleteUpload,
  type AdminRow,
  type Values,
} from "../api/admin-api"
import {
  buildBody,
  fieldPath,
  hasErrors,
  initialValues,
  isRequired,
  otherErrors,
  validateBody,
  type FieldErrors,
  type FormValues,
} from "../lib/form"
import type { EntityConfig } from "../model/entities"
import { errorMessage } from "./api-error-notice"
import { FieldInput } from "./field-input"

// The fields a new row needs, EN Translation included; the rest is set in
// the editor. `preset` fills fields in advance (the album being listed).
export function CreateDialog({
  entity,
  preset,
  onCreated,
}: {
  entity: EntityConfig
  preset?: Values
  onCreated: (row: AdminRow) => void
}) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<FormValues>({})
  // Upload results that aren't form fields: a photo's width and height.
  const [extra, setExtra] = useState<Values>({})
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failure, setFailure] = useState<string>()
  const [pending, setPending] = useState(false)
  // Every file uploaded while the dialog is open; those the new row doesn't
  // name are removed from R2 again.
  const uploads = useRef<string[]>([])

  function reset() {
    setValues(initialValues(entity.createFields, preset))
    setExtra({})
    setErrors({})
    setFailure(undefined)
    uploads.current = []
  }

  function dropUploads(keep: unknown[] = []) {
    for (const key of uploads.current) {
      if (!keep.includes(key)) void deleteUpload(key).catch(() => {})
    }
    uploads.current = []
  }

  function onOpenChange(next: boolean) {
    if (next) reset()
    else dropUploads()
    setOpen(next)
  }

  function onUploaded(key: string, filled: Values) {
    uploads.current.push(key)
    const fieldNames = new Set(entity.createFields.map((field) => field.name))
    const formFilled: FormValues = {}
    const rest: Values = {}
    for (const [name, value] of Object.entries(filled)) {
      if (fieldNames.has(name)) formFilled[name] = String(value)
      else rest[name] = value
    }
    setValues((current) => ({ ...current, ...formFilled }))
    setExtra((current) => ({ ...current, ...rest }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const body = buildBody(entity, values, extra)
    const found = validateBody(entity, body)
    setErrors(found)
    setFailure(undefined)
    if (hasErrors(found)) return

    setPending(true)
    try {
      const row = await createRow(
        entity.path,
        entity.schemas.entity,
        body,
        entity.single ? "PUT" : "POST"
      )
      dropUploads(Object.values(body))
      setOpen(false)
      onCreated(row)
    } catch (caught) {
      if (caught instanceof AdminApiError && hasErrors(caught.fields)) {
        setErrors(caught.fields)
      } else {
        setFailure(
          caught instanceof AdminApiError ? errorMessage(caught) : "Failed."
        )
      }
    } finally {
      setPending(false)
    }
  }

  const leftover = otherErrors(entity.createFields, errors)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden data-icon="inline-start" />
          New {entity.singular}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <form
          noValidate
          onSubmit={onSubmit}
          className="flex flex-col gap-zsd-md"
        >
          <DialogHeader>
            <DialogTitle>New {entity.singular}</DialogTitle>
            <DialogDescription>
              {entity.translated
                ? "Text fields are the EN Translation; other Langs go in the editor."
                : "The rest can be changed in the editor."}
            </DialogDescription>
          </DialogHeader>
          {entity.createFields.map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              value={values[field.name] ?? ""}
              required={isRequired(entity.schemas.create, fieldPath(field))}
              errors={errors[fieldPath(field)]}
              onChange={(value) =>
                setValues((current) => ({ ...current, [field.name]: value }))
              }
              onUploaded={onUploaded}
            />
          ))}
          {(failure || leftover.length > 0) && (
            <div role="alert" className="text-zsd-body-sm text-zsd-error">
              {failure && <p>{failure}</p>}
              {leftover.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
